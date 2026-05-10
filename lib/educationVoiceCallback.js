import crypto from "node:crypto";
import express from "express";
import twilio from "twilio";

import {
  allowSharedOutboundVoiceMinGap,
  beginSharedOutboundVoiceDial,
  endSharedOutboundVoiceDial,
  recordSharedOutboundVoiceSuccess,
} from "./outboundVoiceGate.js";
import { getCurriculumLineByCode } from "./curriculumDirectory.js";

const twilioUrlEncoded = express.urlencoded({ extended: false });

const ED_VOICEMAIL_AUDIO_PATH = "/twilio/education/audio.mp3";
const ED_VOICEMAIL_VOICE_PATH = "/twilio/education/voice";

const educationAudioByToken = new Map();
const lastEducationOutboundAt = new Map();

function eduVoiceEnabled() {
  const v = String(process.env.EDUCATION_VOICE_ENABLED || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_CALLER_ID);
}

function ttsConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID);
}

function basePublicUrl() {
  return String(process.env.PUBLIC_APP_URL || "").replace(/\/$/, "");
}

function rateLimitBypassed() {
  const v = String(process.env.EDUCATION_VOICE_RATE_LIMIT_DISABLED || "").toLowerCase();
  return v === "1" || v === "true";
}

function getRateWindowMs() {
  const n = Number(process.env.EDUCATION_VOICE_RATE_WINDOW_MS);
  return Number.isFinite(n) && n > 0 ? n : 24 * 60 * 60 * 1000;
}

function getMaxCallsPerWindow() {
  const n = Number(process.env.EDUCATION_VOICE_MAX_PER_WINDOW);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

const callHistoryByPhone = new Map();

function allowRateLimitedCallNormalized(normalizedPhone) {
  if (rateLimitBypassed()) return true;
  const windowMs = getRateWindowMs();
  const maxCalls = getMaxCallsPerWindow();
  const now = Date.now();
  let times = callHistoryByPhone.get(normalizedPhone) || [];
  times = times.filter((t) => now - t < windowMs);
  if (times.length >= maxCalls) return false;
  times.push(now);
  callHistoryByPhone.set(normalizedPhone, times);
  return true;
}

function allowMinIntervalMs(normalizedPhone) {
  const ms = Number(process.env.EDUCATION_VOICE_MIN_INTERVAL_MS);
  if (!Number.isFinite(ms) || ms <= 0) return true;
  const last = lastEducationOutboundAt.get(normalizedPhone) || 0;
  if (Date.now() - last < ms) {
    console.warn(
      `[education-voice] skip: same callee within EDUCATION_VOICE_MIN_INTERVAL_MS (${ms}ms)`,
    );
    return false;
  }
  return true;
}

function pruneEducationAudioCache() {
  const now = Date.now();
  for (const [k, v] of educationAudioByToken.entries()) {
    if (!v || v.expiresAt <= now) educationAudioByToken.delete(k);
  }
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

function voiceTokenFromRequest(req) {
  const q =
    typeof req.query?.token === "string"
      ? req.query.token
      : Array.isArray(req.query?.token)
        ? req.query.token[0]
        : "";
  if (req.method === "POST" && req.body && typeof req.body.token === "string") return req.body.token.trim();
  return String(q || "").trim();
}

function ensureEducationAudioRecord(tokenRaw) {
  const t = String(tokenRaw || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(t)) return null;
  pruneEducationAudioCache();
  const rec = educationAudioByToken.get(t);
  if (!rec || rec.expiresAt <= Date.now()) {
    educationAudioByToken.delete(t);
    return null;
  }
  return rec;
}

async function synthesizeMp3(text) {
  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
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

export function logEducationVoiceConfig() {
  if (!eduVoiceEnabled()) return;
  const missing = [];
  if (!twilioConfigured()) missing.push("Twilio SID, auth token, caller ID");
  if (!ttsConfigured()) missing.push("ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID");
  if (!basePublicUrl()) missing.push("PUBLIC_APP_URL");
  if (missing.length) {
    console.warn("[education-voice] enabled but incomplete:", missing.join(", "));
    return;
  }
  console.log(
    `[education-voice] TTS outbound calls — max ${getMaxCallsPerWindow()} per ${getRateWindowMs() / 3600000}h per number (disable rate limit with EDUCATION_VOICE_RATE_LIMIT_DISABLED=1); directory ${getCurriculumLineByCode().size} RTK lines`,
  );
}

/**
 * One-way curriculum call: ElevenLabs TTS → Twilio Play.
 *
 * @param {{ toE164: string; script: string }} args
 */
export async function maybePlaceEducationVoiceCall(args) {
  const toE164 = String(args?.toE164 || "").trim();
  const script = String(args?.script || "").trim();

  if (!eduVoiceEnabled() || !twilioConfigured() || !ttsConfigured()) return;
  const publicBase = basePublicUrl();
  if (!publicBase) {
    console.warn("[education-voice] PUBLIC_APP_URL missing");
    return;
  }
  if (!toE164.startsWith("+") || !script) return;

  if (!beginSharedOutboundVoiceDial(toE164)) {
    console.warn("[education-voice] skip: outbound voice already in progress for callee");
    return;
  }

  try {
    if (!allowRateLimitedCallNormalized(toE164)) {
      console.warn("[education-voice] rate limit exceeded for callee");
      return;
    }
    if (!allowMinIntervalMs(toE164)) return;
    if (!allowSharedOutboundVoiceMinGap(toE164)) return;

    let buffer;
    try {
      buffer = await synthesizeMp3(script.slice(0, Number(process.env.EDUCATION_VOICE_MAX_SCRIPT_CHARS || 14000)));
    } catch (err) {
      console.error("[education-voice] ElevenLabs TTS failed:", err?.message || err);
      return;
    }

    const tokenKey = crypto.randomBytes(32).toString("hex").toLowerCase();
    const ttlMs = Number(process.env.EDUCATION_VOICE_AUDIO_TOKEN_TTL_MS || 600000);
    pruneEducationAudioCache();
    educationAudioByToken.set(tokenKey, { buffer, expiresAt: Date.now() + ttlMs });
    const twimlUrl = `${publicBase}${ED_VOICEMAIL_VOICE_PATH}?token=${encodeURIComponent(tokenKey)}`;

    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const statusUrl = `${publicBase}/twilio/voice/status`;
      const statusOff =
        String(process.env.TWILIO_EDUCATION_STATUS_CALLBACK_OFF || "").toLowerCase() === "1" ||
        String(process.env.TWILIO_EDUCATION_STATUS_CALLBACK_OFF || "").toLowerCase() === "true";

      await client.calls.create({
        to: toE164,
        from: process.env.TWILIO_CALLER_ID,
        url: twimlUrl,
        ...(statusOff
          ? {}
          : {
              statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL || statusUrl,
              statusCallbackMethod: "POST",
              statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
            }),
      });
      lastEducationOutboundAt.set(toE164, Date.now());
      recordSharedOutboundVoiceSuccess(toE164);
      console.log("[education-voice] outbound call initiated (tts)");
    } catch (err) {
      console.error("[education-voice] Twilio:", err?.message || err);
      const m = twimlUrl.match(/token=([a-f0-9]{64})/i);
      if (m?.[1]) educationAudioByToken.delete(m[1].toLowerCase());
    }
  } finally {
    endSharedOutboundVoiceDial(toE164);
  }
}

export function attachEducationVoiceRoutes(app) {
  function handlePlayTwiMl(req, res) {
    if (!validateTwilioRequest(req)) {
      return res.status(403).type("text/plain").send("");
    }

    const token = voiceTokenFromRequest(req);
    const rec = ensureEducationAudioRecord(token.toLowerCase());
    if (!rec) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: "alice" }, "Sorry, this lesson link expired.");
      return res.type("text/xml").send(vr.toString());
    }

    const publicBase = basePublicUrl();
    if (!publicBase) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.hangup();
      return res.type("text/xml").send(vr.toString());
    }

    const tokenNorm = String(token || "").trim().toLowerCase();
    const playUrl = `${publicBase}${ED_VOICEMAIL_AUDIO_PATH}?token=${encodeURIComponent(tokenNorm)}`;

    const vr = new twilio.twiml.VoiceResponse();
    vr.play(playUrl);
    res.type("text/xml").send(vr.toString());
  }

  app.get(ED_VOICEMAIL_VOICE_PATH, handlePlayTwiMl);
  app.post(ED_VOICEMAIL_VOICE_PATH, twilioUrlEncoded, handlePlayTwiMl);

  app.get(ED_VOICEMAIL_AUDIO_PATH, (req, res) => {
    const q = req.query?.token;
    const t = typeof q === "string" ? q : Array.isArray(q) ? q[0] : "";
    const ensured = ensureEducationAudioRecord(String(t).trim().toLowerCase());
    if (!ensured) return res.sendStatus(404);
    res.setHeader("Cache-Control", "no-store");
    res.type("audio/mpeg");
    return res.send(ensured.buffer);
  });
}
