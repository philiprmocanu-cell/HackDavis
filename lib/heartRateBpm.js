/**
 * Experimental phonocardiology-style BPM estimate from mono PCM.
 * Telephony audio is noisy; this returns null when the estimate is unreliable.
 */

/** μ-law decode byte -> linear int16 */
const MULAW_BIAS = 33;

function mulawToLinear(mu) {
  const u = mu & 0xff;
  let t = ((u & 0x0f) << 3) + MULAW_BIAS;
  t <<= (u & 0x70) >> 4;
  t -= MULAW_BIAS;
  return (u & 0x80) !== 0 ? MULAW_BIAS - t : t - MULAW_BIAS;
}

/** 8-bit μ-law PCM buffer -> Float32Array [-1,1] */
export function decodeMulawToFloat(mulawBuf) {
  const n = mulawBuf.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = mulawToLinear(mulawBuf[i]) / 32768;
  }
  return out;
}

/** Parse minimal WAV: PCM 16-bit mono/stereo or μ-law mono (format 7). */
export function parseWavToMonoFloat(buf) {
  if (buf.length < 44) throw new Error("WAV too small");
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const riff = String.fromCharCode(buf[0], buf[1], buf[2], buf[3]);
  if (riff !== "RIFF") throw new Error("not RIFF");
  const format = dv.getUint16(20, true);
  const channels = dv.getUint16(22, true);
  const sampleRate = dv.getUint32(24, true);
  const bits = dv.getUint16(34, true);

  let off = 12;
  let dataOffset = 0;
  let dataSize = 0;
  while (off + 8 <= buf.length) {
    const id = String.fromCharCode(buf[off], buf[off + 1], buf[off + 2], buf[off + 3]);
    const size = dv.getUint32(off + 4, true);
    if (id === "data") {
      dataOffset = off + 8;
      dataSize = size;
      break;
    }
    off += 8 + size + (size % 2);
  }
  if (!dataSize || dataOffset + dataSize > buf.length) throw new Error("no WAV data chunk");

  const data = buf.subarray(dataOffset, dataOffset + dataSize);
  let mono;

  if (format === 1 && bits === 16) {
    const dview = new DataView(buf.buffer, buf.byteOffset + dataOffset, dataSize);
    const samples = Math.floor(data.length / 2 / channels);
    mono = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      let acc = 0;
      for (let c = 0; c < channels; c++) {
        const idx = (i * channels + c) * 2;
        acc += dview.getInt16(idx, true);
      }
      mono[i] = acc / channels / 32768;
    }
  } else if (format === 7 && bits === 8 && channels === 1) {
    mono = decodeMulawToFloat(data);
  } else {
    throw new Error(`unsupported WAV format ${format} bits=${bits} ch=${channels}`);
  }

  return { samples: mono, sampleRate };
}

function biquad(df, b0, b1, b2, a1, a2) {
  const n = df.length;
  const y = new Float32Array(n);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < n; i++) {
    const x = df[i];
    const yn = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    y[i] = yn;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = yn;
  }
  return y;
}

function lowpassCoeffs(fs, fc, q) {
  const w0 = (2 * Math.PI * fc) / fs;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const b0 = (1 - cos) / 2;
  const b1 = 1 - cos;
  const b2 = (1 - cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

function highpassCoeffs(fs, fc, q) {
  const w0 = (2 * Math.PI * fc) / fs;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const b0 = (1 + cos) / 2;
  const b1 = -(1 + cos);
  const b2 = (1 + cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

function bandpassHeart(fs, x) {
  const hp = highpassCoeffs(fs, 35, 0.707);
  let y = biquad(x, hp.b0, hp.b1, hp.b2, hp.a1, hp.a2);
  const lp = lowpassCoeffs(fs, 140, 0.707);
  y = biquad(y, lp.b0, lp.b1, lp.b2, lp.a1, lp.a2);
  return y;
}

function envelopeSmooth(x, win) {
  const n = x.length;
  const y = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = Math.abs(x[i]);
    sum += v;
    if (i >= win) sum -= Math.abs(x[i - win]);
    y[i] = i >= win ? sum / win : sum / (i + 1);
  }
  return y;
}

function mean(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i];
  return s / x.length;
}

function subtractMean(x) {
  const m = mean(x);
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] - m;
  return y;
}

function downsampleMean(x, factor) {
  const outLen = Math.floor(x.length / factor);
  const y = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    let s = 0;
    const base = i * factor;
    for (let j = 0; j < factor; j++) s += x[base + j];
    y[i] = s / factor;
  }
  return y;
}

function autocorr(x) {
  const n = x.length;
  const ac = new Float32Array(n);
  for (let lag = 0; lag < n; lag++) {
    let s = 0;
    for (let i = 0; i < n - lag; i++) s += x[i] * x[i + lag];
    ac[lag] = s / (n - lag);
  }
  return ac;
}

/**
 * @param {Float32Array} samples
 * @param {number} sampleRate
 * @returns {{ bpm: number | null; confidence: number; detail: string }}
 */
export function estimateBpmFromPcm(samples, sampleRate) {
  if (samples.length < sampleRate * 0.5) {
    return { bpm: null, confidence: 0, detail: "too_few_samples" };
  }

  const x = subtractMean(samples);
  const bp = bandpassHeart(sampleRate, x);
  const win = Math.max(8, Math.floor(sampleRate * 0.02));
  const env = envelopeSmooth(bp, win);

  const targetEnvFs = 200;
  const factor = Math.max(1, Math.floor(sampleRate / targetEnvFs));
  const envd = downsampleMean(env, factor);
  const envFs = sampleRate / factor;
  const e = subtractMean(envd);

  const ac = autocorr(e);
  const minLag = Math.floor(envFs * 0.35);
  const maxLag = Math.floor(envFs * 1.5);

  if (maxLag >= ac.length) {
    return { bpm: null, confidence: 0, detail: "lag_range" };
  }

  let peakLag = minLag;
  let peakVal = ac[minLag];
  for (let lag = minLag + 1; lag <= maxLag && lag < ac.length; lag++) {
    if (ac[lag] > peakVal) {
      peakVal = ac[lag];
      peakLag = lag;
    }
  }

  const zeroLag = ac[0] > 1e-10 ? ac[0] : 1;
  const confidence = Math.min(1, peakVal / zeroLag);

  if (confidence < 0.12 || peakVal < 1e-8) {
    return { bpm: null, confidence, detail: "weak_periodicity" };
  }

  const bpm = (60 * envFs) / peakLag;
  if (!Number.isFinite(bpm) || bpm < 35 || bpm > 220) {
    return { bpm: null, confidence, detail: "bpm_out_of_range" };
  }

  return { bpm: Math.round(bpm), confidence, detail: "ok" };
}

/**
 * @param {Buffer} wavOrRawBuffer - WAV file bytes
 */
export function estimateBpmFromWavBuffer(wavOrRawBuffer) {
  const { samples, sampleRate } = parseWavToMonoFloat(wavOrRawBuffer);
  return estimateBpmFromPcm(samples, sampleRate);
}
