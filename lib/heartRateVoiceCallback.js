import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import twilio from "twilio";

import { estimateBpmFromWavBuffer } from "./heartRateBpm.js";
import {
  allowSharedOutboundVoiceMinGap,
  beginSharedOutboundVoiceDial,
  endSharedOutboundVoiceDial,
  recordSharedOutboundVoiceSuccess,
} from "./outboundVoiceGate.js";

const voDirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCRIPT_PATH = path.join(voDirname, "..", "heart-rate-voice-script.md");

const HR_VOICEMAIL_INTRO_AUDIO = "/twilio/heart-rate/intro.mp3";
const HR_VOICEMAIL_RESULT_AUDIO = "/twilio/heart-rate/result.mp3";
const HR_VOICEMAIL_START_PATH = "/twilio/heart-rate/start";
const HR_VOICEMAIL_AFTER_RECORD_PATH = "/twilio/heart-rate/after-record";

const twilioUrlEncoded = express.urlencoded({ extended: false });
const introMp3ByScriptHash = new Map();
const resultAudioByToken = new Map();

function getElevenLabsClientHeaders() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("missing ELEVENLABS_API_KEY");
  return key;
}

async function synthesizeMp3(text) {
  const key = getElevenLabsClientHeaders();
  const voiceId = process.env.HEART_RATE_VOICE_ID || process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) throw new Error("missing ELEVENLABS_VOICE_ID or HEART_RATE_VOICE_ID");
  const model_id = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({ text, model_id }),
  });
  const errText = !res.ok ? await res.text() : "";
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${errText.slice(0, 300)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error("empty audio from ElevenLabs");
  return buf;
}

function heartRateFeatureEnabled() {
  const v = String(process.env.HEART_RATE_VOICE_ENABLED || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function basePublicUrl() {
  return String(process.env.PUBLIC_APP_URL || "").replace(/\/$/, "");
}

function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_CALLER_ID);
}

function validateTwilioRequest(req) {
  const auth = process.env.TWILIO_AUTH_TOKEN;
  if (!auth) return false;
  const xfProto = req.get("x-forwarded-proto");
  const protocol =
    (typeof xfProto === "string" ? xfProto.split(",")[0] : "").trim() || req.protocol || "https";
  return twilio.validateExpressRequest(req, auth, {
    protocol,
    host: req.get("host"),
  });
}

function resolvedScriptPath() {
  const custom = process.env.HEART_RATE_VOICE_SCRIPT_MD?.trim();
  if (custom) return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  return DEFAULT_SCRIPT_PATH;
}

function loadIntroEnglishText() {
  try {
    const raw = fs.readFileSync(resolvedScriptPath(), "utf8");
    const m = raw.match(/##\s*intro_english\s*([\s\S]*?)(?=\n##\s|$)/i);
    if (m) return m[1].trim().replace(/\s+/g, " ");
  } catch {
    console.warn("[heart-rate-voice] unreadable script:", resolvedScriptPath());
  }
  return "If you have severe chest pain, shortness of breath, or think it is an emergency, hang up and call emergency services now. This is not a doctor. Press the phone gently on your chest near your heart. Stay quiet for thirty seconds.";
}

async function ensureIntroMp3Cached() {
  const text = loadIntroEnglishText();
  const h = crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
  if (introMp3ByScriptHash.has(h)) return { hash: h, buffer: introMp3ByScriptHash.get(h) };
  const buf = await synthesizeMp3(text.slice(0, 4500));
  introMp3ByScriptHash.set(h, buf);
  return { hash: h, buffer: buf };
}

function buildResultScript(estimate) {
  const tail =
    "This was experimental phone audio, not a stethoscope or medical device. If you have chest pain, pressure, pain spreading to your arm or jaw, severe shortness of breath, fainting, or feel unsafe, seek emergency care now. Otherwise follow up with a clinician for any symptoms. Goodbye.";
  if (estimate.bpm == null) {
    return `We could not estimate a clear pulse from this recording. The phone signal may be too noisy, the hold may be unstable, or the file format was not usable. ${tail}`;
  }
  return `A rough automated estimate from this recording is about ${estimate.bpm} beats per minute. That number can be wrong. Many adults at rest often fall roughly between sixty and one hundred beats per minute, but healthy ranges vary by person, activity, and medications. Do not rely on this call to decide if you are fine. ${tail}`;
}

function stashResultAudio(buffer) {
  const token = crypto.randomBytes(32).toString("hex").toLowerCase();
  const ttlMs = Number(process.env.HEART_RATE_AUDIO_TOKEN_TTL_MS || 600000);
  resultAudioByToken.set(token, { buffer, expiresAt: Date.now() + ttlMs });
  return token;
}

function getResultAudio(tokenRaw) {
  const t = String(tokenRaw || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(t)) return null;
  const now = Date.now();
  const rec = resultAudioByToken.get(t);
  if (!rec || rec.expiresAt <= now) {
    resultAudioByToken.delete(t);
    return null;
  }
  return rec.buffer;
}

async function fetchTwilioRecording(recordingUrl) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(recordingUrl, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`recording fetch ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export function logHeartRateVoiceConfig() {
  if (!heartRateFeatureEnabled()) return;
  const missing = [];
  if (!twilioConfigured()) missing.push("Twilio SID, auth token, caller ID");
  if (!process.env.PUBLIC_APP_URL) missing.push("PUBLIC_APP_URL");
  if (!process.env.ELEVENLABS_API_KEY) missing.push("ELEVENLABS_API_KEY");
  if (!process.env.ELEVENLABS_VOICE_ID && !process.env.HEART_RATE_VOICE_ID) {
    missing.push("ELEVENLABS_VOICE_ID or HEART_RATE_VOICE_ID");
  }
  if (missing.length) {
    console.warn("[heart-rate-voice] enabled but incomplete:", missing.join(", "));
    return;
  }
  console.log(
    `[heart-rate-voice] TTS + Record flow; intro from ${path.basename(resolvedScriptPath())}. Non-diagnostic — see HEART_RATE_VOICE.md.`,
  );
  void ensureIntroMp3Cached().catch((err) => {
    console.warn("[heart-rate-voice] intro warm failed:", err?.message || err);
  });
}

/**
 * Outbound call: Play intro → Record 30s → analyze → Play result.
 */
export async function maybePlaceHeartRateCall(args) {
  const toE164 = String(args?.toE164 || "").trim();
  if (!heartRateFeatureEnabled()) {
    console.warn("[heart-rate-voice] skip: HEART_RATE_VOICE_ENABLED is off");
    return;
  }
  if (!twilioConfigured()) {
    console.warn("[heart-rate-voice] skip: Twilio credentials or TWILIO_CALLER_ID missing");
    return;
  }
  const publicBase = basePublicUrl();
  if (!publicBase) {
    console.warn("[heart-rate-voice] PUBLIC_APP_URL missing");
    return;
  }
  if (!toE164.startsWith("+")) {
    console.warn("[heart-rate-voice] skip: recipient must be +E164");
    return;
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    console.warn("[heart-rate-voice] skip: ELEVENLABS_API_KEY missing");
    return;
  }
  if (!process.env.ELEVENLABS_VOICE_ID && !process.env.HEART_RATE_VOICE_ID) {
    console.warn("[heart-rate-voice] skip: ELEVENLABS_VOICE_ID or HEART_RATE_VOICE_ID missing");
    return;
  }

  if (!beginSharedOutboundVoiceDial(toE164)) {
    console.warn("[heart-rate-voice] skip: outbound voice already in progress for callee");
    return;
  }

  try {
    if (!allowSharedOutboundVoiceMinGap(toE164)) return;

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const twimlUrl = `${publicBase}${HR_VOICEMAIL_START_PATH}`;
    await client.calls.create({
      to: toE164,
      from: process.env.TWILIO_CALLER_ID,
      url: twimlUrl,
    });
    recordSharedOutboundVoiceSuccess(toE164);
    console.log("[heart-rate-voice] outbound call initiated");
  } catch (err) {
    console.error("[heart-rate-voice] Twilio:", err?.message || err);
  } finally {
    endSharedOutboundVoiceDial(toE164);
  }
}

export function attachHeartRateVoiceRoutes(app) {
  async function handleIntroMp3(_req, res) {
    try {
      const { buffer } = await ensureIntroMp3Cached();
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.type("audio/mpeg").send(buffer);
    } catch (err) {
      console.error("[heart-rate-voice] intro mp3:", err?.message || err);
      res.sendStatus(500);
    }
  }

  function handleResultMp3(req, res) {
    const q = req.query?.token;
    const t = typeof q === "string" ? q : Array.isArray(q) ? q[0] : "";
    const buf = getResultAudio(String(t).trim().toLowerCase());
    if (!buf) return res.sendStatus(404);
    res.setHeader("Cache-Control", "no-store");
    res.type("audio/mpeg").send(buf);
  }

  async function handleStartTwiMl(req, res) {
    if (!validateTwilioRequest(req)) {
      return res.status(403).type("text/plain").send("");
    }
    const publicBase = basePublicUrl();
    if (!publicBase) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: "alice" }, "Configuration error.");
      return res.type("text/xml").send(vr.toString());
    }

    try {
      await ensureIntroMp3Cached();
    } catch {
      /* handled below */
    }

    const introUrl = `${publicBase}${HR_VOICEMAIL_INTRO_AUDIO}`.replace(/"/g, "");
    const actionUrl = `${publicBase}${HR_VOICEMAIL_AFTER_RECORD_PATH}`.replace(/"/g, "");

    const vr = new twilio.twiml.VoiceResponse();
    vr.play(introUrl);
    vr.record({
      maxLength: 30,
      playBeep: false,
      trim: "do-not-trim",
      timeout: 60,
      action: actionUrl,
      method: "POST",
    });
    res.type("text/xml").send(vr.toString());
  }

  async function handleAfterRecord(req, res) {
    if (!validateTwilioRequest(req)) {
      return res.status(403).type("text/plain").send("");
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const recordingUrl = String(body.RecordingUrl || "").trim();
    const callSid = String(body.CallSid || "").trim();
    const recordingStatus = String(body.RecordingStatus || "").trim();

    const vr = new twilio.twiml.VoiceResponse();
    const publicBase = basePublicUrl();

    const failSay = (msg) => {
      vr.say({ voice: "alice" }, msg);
      vr.hangup();
    };

    if (!publicBase) {
      failSay("Sorry, this service is not configured.");
      return res.type("text/xml").send(vr.toString());
    }

    if (recordingStatus === "failed" || !recordingUrl) {
      failSay(
        "We did not receive a usable recording. If you have chest pain or feel unwell, seek emergency care. Goodbye.",
      );
      return res.type("text/xml").send(vr.toString());
    }

let estimate = { bpm: null, confidence: 0, detail: "no_audio" };
    try {
      const raw = await fetchTwilioRecording(recordingUrl);
      if (raw.length >= 12 && String.fromCharCode(raw[0], raw[1], raw[2], raw[3]) === "RIFF") {
        estimate = estimateBpmFromWavBuffer(raw);
      } else {
        estimate = { bpm: null, confidence: 0, detail: "non_wav_mvp" };
      }
    } catch (err) {
      console.warn("[heart-rate-voice] recording/analysis:", err?.message || err);
      estimate = { bpm: null, confidence: 0, detail: String(err?.message || "fetch_error") };
    }

    if (callSid) {
      console.log("[heart-rate-voice] after-record", {
        CallSid: callSid,
        bpm: estimate.bpm,
        detail: estimate.detail,
        confidence: estimate.confidence?.toFixed?.(3) ?? estimate.confidence,
      });
    }

    const script = buildResultScript(estimate);
    try {
      const mp3 = await synthesizeMp3(script.slice(0, 5000));
      const token = stashResultAudio(mp3);
      const playUrl = `${publicBase}${HR_VOICEMAIL_RESULT_AUDIO}?token=${encodeURIComponent(token)}`;
      vr.play(playUrl);
    } catch (err) {
      console.error("[heart-rate-voice] result TTS failed:", err?.message || err);
      failSay(
        "We could not read your result aloud. If you have worrisome symptoms, seek emergency care. Goodbye.",
      );
      return res.type("text/xml").send(vr.toString());
    }

    vr.hangup();
    res.type("text/xml").send(vr.toString());
  }

  app.get(HR_VOICEMAIL_INTRO_AUDIO, handleIntroMp3);
  app.post(HR_VOICEMAIL_INTRO_AUDIO, twilioUrlEncoded, handleIntroMp3);

  app.get(HR_VOICEMAIL_RESULT_AUDIO, handleResultMp3);
  app.post(HR_VOICEMAIL_RESULT_AUDIO, twilioUrlEncoded, handleResultMp3);

  app.post(HR_VOICEMAIL_START_PATH, twilioUrlEncoded, (req, res, next) => {
    Promise.resolve(handleStartTwiMl(req, res)).catch(next);
  });
  app.get(HR_VOICEMAIL_START_PATH, (req, res, next) => {
    Promise.resolve(handleStartTwiMl(req, res)).catch(next);
  });

  app.post(HR_VOICEMAIL_AFTER_RECORD_PATH, twilioUrlEncoded, (req, res, next) => {
    Promise.resolve(handleAfterRecord(req, res)).catch(next);
  });
}
