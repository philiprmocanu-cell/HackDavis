import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import twilio from "twilio";

import { ElevenLabsClient, ElevenLabs } from "@elevenlabs/elevenlabs-js";

import {
  allowSharedOutboundVoiceMinGap,
  beginSharedOutboundVoiceDial,
  endSharedOutboundVoiceDial,
  recordSharedOutboundVoiceSuccess,
} from "./outboundVoiceGate.js";
import { parseModelCompletion, MEDICAL_ESCALATION_VOICE_CALLBACK } from "./modelJson.js";

const voDirname = path.dirname(fileURLToPath(import.meta.url));
const VO_DEFAULT_CONV_PROMPT_PATH = path.join(voDirname, "..", "conversation-agent-prompt.md");
const VO_DEFAULT_EMERGENCY_CONTEXT_PATH = path.join(voDirname, "..", "haryana-emergencies-context.md");

/** Fallback system instructions if Markdown prompt file cannot be loaded. */
const INLINE_FALLBACK_VO_SYSTEM_PROMPT = `You respond by voice after SMS escalation toward health-related assistance. Never claim to be a doctor.


Do not diagnose, prescribe, dose, or give definitive treatment. For severe symptoms or uncertainties, calmly direct callers to timely local clinic or emergency care in their context.


Discuss only medical triage, general health education, urgency, clarification of vague medical wording. Refuse unrelated topics briefly and steer back to health.`;


/** Phase 1: fixed script rendered as ElevenLabs TTS then played via TwiML <Play>. */
const MEDICAL_VOICE_SCRIPT_DEFAULT = `
Namaste. This is an automated reminder, not emergency services—if urgent, seek local emergency care right away.

We cannot diagnose or prescribe by phone. Please see a licensed doctor or health center for symptoms, medicines, and serious concerns.

Dhanyawaad—aap apna dhyaan rakhiye.
`.replace(/\s+/g, " ").trim();

const VOICEMAIL_AUDIO_PATH = "/twilio/audio.mp3";
const VOICEMAIL_AGENT_PATH = "/twilio/voice/agent";
const VOICEMAIL_STREAM_STATUS_PATH = "/twilio/voice/stream-status";

const audioByToken = new Map(); // tokenLower -> { buffer, expiresAt }
/** Ensures concurrent Twilio fetches for one leg share one `registerCall` (duplicate sessions often drop instantly). */
const agentRegisterLocks = new Map(); // CallSid → Promise<string> (resolved TwiML xml)

const twilioUrlEncoded = express.urlencoded({ extended: false });

let elevenLabsLazy = null;

function getElevenLabsClient() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("missing ELEVENLABS_API_KEY");
  elevenLabsLazy ||= new ElevenLabsClient({ apiKey: key });
  return elevenLabsLazy;
}

function basePublicUrl() {
  return String(process.env.PUBLIC_APP_URL || "").replace(/\/$/, "");
}

/** Twilio posts stream-started / stream-stopped / stream-error for `<Connect><Stream>` (diagnoses instant hangups). */
function attachElevenLabsStreamStatusCallback(xml) {
  const base = basePublicUrl();
  if (!base || /\bstatusCallback\s*=/i.test(xml)) return xml;
  const cbUrl = `${base}${VOICEMAIL_STREAM_STATUS_PATH}`.replace(/"/g, "");
  return xml.replace(
    /(<Stream)(\s[^>]*?)(\s*\/?>)/i,
    (full, tag, attrs, ending) => {
      if (/^\s*\/>/.test(ending)) return full;
      const gap = /\S/.test(attrs) ? " " : "";
      return `${tag}${attrs}${gap}statusCallback="${cbUrl}" statusCallbackMethod="POST"${ending}`;
    },
  );
}

function isFeatureEnabled() {
  const v = String(process.env.MEDICAL_CALLBACK_ENABLED || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** `tts` (default): one-way ElevenLabs TTS playback. `conversation`: ElevenLabs agent via registerCall TwiML. */
function voiceMode() {
  const m = String(process.env.MEDICAL_VOICE_MODE || "tts").trim().toLowerCase();
  if (m === "conversation" || m === "agent" || m === "convai") return "conversation";
  return "tts";
}

function rateLimitBypassed() {
  const v = String(process.env.MEDICAL_CALLBACK_RATE_LIMIT_DISABLED || "").toLowerCase();
  return v === "1" || v === "true";
}

function getRateWindowMs() {
  const n = Number(process.env.MEDICAL_CALLBACK_RATE_WINDOW_MS);
  return Number.isFinite(n) && n > 0 ? n : 24 * 60 * 60 * 1000;
}

function getMaxCallsPerWindow() {
  const n = Number(process.env.MEDICAL_CALLBACK_MAX_PER_WINDOW);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function parseEscalationFromCompletion(raw) {
  const { medical_escalation } = parseModelCompletion(raw);
  return medical_escalation === MEDICAL_ESCALATION_VOICE_CALLBACK
    ? MEDICAL_ESCALATION_VOICE_CALLBACK
    : "none";
}

/** ElevenLabs `registerCall` direction. Outbound Twilio programmatic calls normally use outbound; try inbound if streams drop instantly (200 TwiML) with μ-law already set. */
function telephonyDirectionForRegisterCall() {
  const raw = String(process.env.ELEVENLABS_TWILIO_REGISTER_DIRECTION ?? "outbound")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (raw === "inbound") return ElevenLabs.TelephonyDirection.Inbound;
  return ElevenLabs.TelephonyDirection.Outbound;
}

function medicalVoiceDebug() {
  const v = String(process.env.MEDICAL_VOICE_DEBUG || "").toLowerCase();
  return v === "1" || v === "true";
}

function pruneAudioCache() {
  const now = Date.now();
  for (const [k, v] of audioByToken.entries()) {
    if (!v || v.expiresAt <= now) audioByToken.delete(k);
  }
}

function ttsConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID);
}

function conversationConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID);
}

function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_CALLER_ID);
}

/** True when MEDICAL_VOICE_MODE allows configured paths. */
function elevenLabsVoiceFeatureConfigured() {
  return voiceMode() === "conversation" ? conversationConfigured() : ttsConfigured();
}

export function logMedicalVoiceConfig() {
  if (!isFeatureEnabled()) return;
  const missing = [];
  if (!twilioConfigured()) missing.push("Twilio SID/auth token/caller ID");
  const base = basePublicUrl();
  if (!base) missing.push("PUBLIC_APP_URL");
  const mode = voiceMode();
  if (!elevenLabsVoiceFeatureConfigured()) {
    missing.push(
      mode === "conversation"
        ? "ELEVENLABS_AGENT_ID (+ ELEVENLABS_API_KEY)"
        : "ELEVENLABS_VOICE_ID (+ ELEVENLABS_API_KEY)",
    );
  }
  if (missing.length) console.warn("[medical-voice] enabled but incomplete:", missing.join(", "));
  if (missing.length === 0 && mode === "conversation") {
    console.log(
      "[medical-voice] conversation — ConvAI μ-law 8000 Hz voice + advanced input. Default register-call sends no prompt payload (dashboard-only agent). MEDICAL_AGENT_PROMPT_FROM_FILE=1 merges conversation-agent-prompt.md; optional MEDICAL_AGENT_INCLUDE_EMERGENCY_CONTEXT=1 appends haryana-emergencies-context.md (large — prefer ElevenLabs KB for the full file).",
    );
    const dirRaw = telephonyDirectionForRegisterCall();
    if (dirRaw === ElevenLabs.TelephonyDirection.Inbound)
      console.warn(
        "[medical-voice] registerCall direction=inbound — ElevenLabs programmatic outbound examples use outbound; wrong direction often drops calls immediately.",
      );
    if (promptMdOverrideDisabled()) {
      console.log(
        "[medical-voice] register-call: no conversation_initiation_client_data (ElevenLabs dashboard prompt + opening line).",
      );
    } else {
      console.log(
        `[medical-voice] conversation system prompt from: ${resolvedConversationPromptMdPath()}`,
      );
      if (includeEmergencyContextInPrompt()) {
        console.log(
          `[medical-voice] emergency context append from: ${resolvedEmergencyContextMdPath()} (if truncated, raise MEDICAL_CONV_PROMPT_MAX_CHARS or attach this file in ConvAI Knowledge Base).`,
        );
      }
    }
  }
}

const callHistoryByPhone = new Map();
const lastOutboundSuccessAt = new Map();

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

/** When `MEDICAL_CALLBACK_RATE_LIMIT_DISABLED=1`, still enforce a minimum gap between successful outbound dials (duplicate webhook mitigation). */
function allowMinIntervalMsBetweenOutbound(normalizedPhone) {
  const ms = Number(process.env.MEDICAL_VOICE_MIN_INTERVAL_MS);
  if (!Number.isFinite(ms) || ms <= 0) return true;
  const last = lastOutboundSuccessAt.get(normalizedPhone) || 0;
  if (Date.now() - last < ms) {
    console.warn(
      `[medical-voice] skip: callee called again within MEDICAL_VOICE_MIN_INTERVAL_MS (${ms}ms) — likely duplicate webhook`,
    );
    return false;
  }
  return true;
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

function ensureAudioRecord(tokenRaw) {
  const t = String(tokenRaw || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(t)) return null;
  pruneAudioCache();
  const rec = audioByToken.get(t);
  if (!rec || rec.expiresAt <= Date.now()) {
    audioByToken.delete(t);
    return null;
  }
  return rec;
}

function voiceCallSid(req) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const q =
    typeof req.query?.CallSid === "string"
      ? req.query.CallSid
      : Array.isArray(req.query?.CallSid)
        ? req.query.CallSid[0]
        : "";
  return String(body.CallSid || body.callSid || q || "").trim();
}

function normalizePhoneForTwilio(raw) {
  const s = String(raw || "").replace(/\s/g, "");
  if (!s) return s;
  return s.startsWith("+") ? s : `+${s}`;
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

function twilioFromTo(req) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const fromNumber = normalizePhoneForTwilio(
    body.From || (typeof req.query?.From === "string" ? req.query.From : ""),
  );
  const toNumber = normalizePhoneForTwilio(
    body.To || (typeof req.query?.To === "string" ? req.query.To : ""),
  );
  return { fromNumber, toNumber };
}

let warnedConversationPromptUnreadable = false;
let warnedEmergencyContextUnreadable = false;

function promptMdOverrideDisabled() {
  const forceOff = String(process.env.MEDICAL_AGENT_PROMPT_OVERRIDE_OFF || "").toLowerCase();
  if (forceOff === "1" || forceOff === "true") return true;
  const fromFile = String(process.env.MEDICAL_AGENT_PROMPT_FROM_FILE || "").toLowerCase();
  return !(fromFile === "1" || fromFile === "true");
}

/** Path to Markdown used as ElevenLabs agent system prompt (`registerCall`). */
export function resolvedConversationPromptMdPath() {
  const custom = process.env.ELEVENLABS_CONVERSATION_PROMPT_MD?.trim();
  if (custom) return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  return VO_DEFAULT_CONV_PROMPT_PATH;
}

/** Optional Haryana emergencies reference (large). Prefer attaching the same file in ConvAI Knowledge Base instead of prompt injection. */
export function resolvedEmergencyContextMdPath() {
  const custom = process.env.ELEVENLABS_EMERGENCY_CONTEXT_MD?.trim();
  if (custom) return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  return VO_DEFAULT_EMERGENCY_CONTEXT_PATH;
}

/** Only with MEDICAL_AGENT_PROMPT_FROM_FILE=1 — appends `haryana-emergencies-context.md` (or ELEVENLABS_EMERGENCY_CONTEXT_MD). */
function includeEmergencyContextInPrompt() {
  const v = String(process.env.MEDICAL_AGENT_INCLUDE_EMERGENCY_CONTEXT || "").toLowerCase();
  return v === "1" || v === "true";
}

function truncateConversationPrompt(s) {
  const rawMax = Number(process.env.MEDICAL_CONV_PROMPT_MAX_CHARS || 14000);
  const max = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 14000;
  if (s.length <= max) return s;
  return s.slice(0, max);
}

/** Loads system prompt text for conversational mode (file + truncate, or fallback). */
function loadConversationSystemPromptForRegisterCall() {
  if (promptMdOverrideDisabled()) return null;

  let combined = "";

  try {
    const p = resolvedConversationPromptMdPath();
    const trimmed = fs.readFileSync(p, "utf8").trim();
    if (trimmed.length > 0) combined = trimmed;
  } catch {
    if (!warnedConversationPromptUnreadable) {
      warnedConversationPromptUnreadable = true;
      console.warn(
        `[medical-voice] unreadable conversation prompt file (${resolvedConversationPromptMdPath()}) — using inline fallback.`,
      );
    }
  }

  if (includeEmergencyContextInPrompt()) {
    try {
      const ep = resolvedEmergencyContextMdPath();
      const extra = fs.readFileSync(ep, "utf8").trim();
      if (extra.length > 0) {
        combined = combined
          ? `${combined}\n\n---\n\n## Haryana emergency reference (bundled)\n\n${extra}`
          : extra;
      }
    } catch {
      if (!warnedEmergencyContextUnreadable) {
        warnedEmergencyContextUnreadable = true;
        console.warn(
          `[medical-voice] unreadable emergency context (${resolvedEmergencyContextMdPath()}) — continuing without it.`,
        );
      }
    }
  }

  if (!combined) return truncateConversationPrompt(INLINE_FALLBACK_VO_SYSTEM_PROMPT.trim());

  const truncated = truncateConversationPrompt(combined);
  if (truncated.length < combined.length) {
    console.warn(
      "[medical-voice] prompt + emergency context exceeded MEDICAL_CONV_PROMPT_MAX_CHARS — truncated. For the full ~68k character reference use ElevenLabs Knowledge Base (upload this repo copy) instead of prompt injection.",
    );
  }
  return truncated;
}

/** Dashboard-only by default. With MEDICAL_AGENT_PROMPT_FROM_FILE=1, sends Markdown prompt only (no first_message, no dynamic_variables). */
function buildConversationInitiationClientData() {
  const fullPromptMd = promptMdOverrideDisabled() ? null : loadConversationSystemPromptForRegisterCall();

  if (!fullPromptMd || fullPromptMd.length === 0) return undefined;

  return {
    conversationConfigOverride: {
      agent: {
        prompt: {
          prompt: fullPromptMd,
        },
      },
    },
  };
}

/**
 * Trigger outbound Twilio voice: Phase 1 TTS playback or Phase 2 ElevenLabs conversational agent.
 *
 * @param {{ toE164: string; smsUserMessage?: string }} args
 */
export async function maybePlaceMedicalCallback(args) {
  const toE164 = String(args?.toE164 || "").trim();
  const mode = voiceMode();

  if (!isFeatureEnabled() || !twilioConfigured() || !elevenLabsVoiceFeatureConfigured()) return;

  const publicBase = basePublicUrl();
  if (!publicBase) {
    console.warn("[medical-voice] MEDICAL_CALLBACK enabled but PUBLIC_APP_URL missing");
    return;
  }
  if (!toE164.startsWith("+")) {
    console.warn("[medical-voice] skip: recipient must be +E164");
    return;
  }

  if (!beginSharedOutboundVoiceDial(toE164)) {
    console.warn("[medical-voice] skip: outbound voice already in progress for callee");
    return;
  }

  try {
    if (!allowRateLimitedCallNormalized(toE164)) {
      console.warn("[medical-voice] rate limit exceeded for callee");
      return;
    }
    if (!allowMinIntervalMsBetweenOutbound(toE164)) return;
    if (!allowSharedOutboundVoiceMinGap(toE164)) return;

    let twimlUrl;

    if (mode === "conversation") {
      twimlUrl = `${publicBase}${VOICEMAIL_AGENT_PATH}`;
    } else {
      const script = String(process.env.MEDICAL_VOICE_SCRIPT || MEDICAL_VOICE_SCRIPT_DEFAULT).slice(0, 4000);

      let buffer;
      try {
        buffer = await synthesizeMp3(script);
      } catch (err) {
        console.error("[medical-voice] ElevenLabs TTS failed:", err?.message || err);
        return;
      }

      const tokenKey = crypto.randomBytes(32).toString("hex").toLowerCase();
      const ttlMs = Number(process.env.MEDICAL_VOICE_AUDIO_TOKEN_TTL_MS || 600000);
      pruneAudioCache();
      audioByToken.set(tokenKey, { buffer, expiresAt: Date.now() + ttlMs });
      twimlUrl = `${publicBase}/twilio/voice?token=${encodeURIComponent(tokenKey)}`;
    }

    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const statusUrl = `${publicBase}/twilio/voice/status`;
      const statusOff =
        String(process.env.TWILIO_STATUS_CALLBACK_OFF || "").toLowerCase() === "1" ||
        String(process.env.TWILIO_STATUS_CALLBACK_OFF || "").toLowerCase() === "true";

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
      lastOutboundSuccessAt.set(toE164, Date.now());
      recordSharedOutboundVoiceSuccess(toE164);
      console.log(`[medical-voice] outbound call initiated (mode=${mode})`);
    } catch (err) {
      console.error("[medical-voice] Twilio:", err?.message || err);
      if (mode !== "conversation") {
        const m = twimlUrl.match(/token=([a-f0-9]{64})/i);
        if (m?.[1]) audioByToken.delete(m[1].toLowerCase());
      }
    }
  } finally {
    endSharedOutboundVoiceDial(toE164);
  }
}

/** Registers Twilio webhooks: TTS + optional conversational agent TwiML. */
export function attachMedicalVoiceRoutes(app) {
  function handleVoicePlayTwiMl(req, res) {
    if (!validateTwilioRequest(req)) {
      return res.status(403).type("text/plain").send("");
    }

    const token = voiceTokenFromRequest(req);
    const rec = ensureAudioRecord(token.toLowerCase());
    if (!rec) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: "alice" }, "Sorry, this call link expired.");
      res.type("text/xml").send(vr.toString());
      return;
    }

    const publicBase = basePublicUrl();
    if (!publicBase) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.hangup();
      return res.type("text/xml").send(vr.toString());
    }

    const tokenNorm = String(token || "").trim().toLowerCase();
    const playUrl = `${publicBase}${VOICEMAIL_AUDIO_PATH}?token=${encodeURIComponent(tokenNorm)}`;

    const vr = new twilio.twiml.VoiceResponse();
    vr.play(playUrl);
    res.type("text/xml").send(vr.toString());
  }

  async function handleAgentTwiMl(req, res) {
    if (!validateTwilioRequest(req)) {
      return res.status(403).type("text/plain").send("");
    }

    if (voiceMode() !== "conversation") {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: "alice" }, "Medical voice agent mode is disabled.");
      return res.type("text/xml").send(vr.toString());
    }

    const { fromNumber, toNumber } = twilioFromTo(req);
    if (!fromNumber || !toNumber) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.hangup();
      return res.type("text/xml").send(vr.toString());
    }

    const conversationInitiationClientData = buildConversationInitiationClientData();

    try {
      const eleven = getElevenLabsClient();
      const agentId = String(process.env.ELEVENLABS_AGENT_ID || "").trim();
      if (!agentId) throw new Error("ELEVENLABS_AGENT_ID not set");

      const registerPayload = {
        agentId,
        fromNumber,
        toNumber,
        direction: telephonyDirectionForRegisterCall(),
        ...(conversationInitiationClientData
          ? { conversationInitiationClientData }
          : {}),
      };

      const callSid = voiceCallSid(req);
      const registerOnce = () => eleven.conversationalAi.twilio.registerCall(registerPayload);

      let twiml;
      if (!callSid) {
        twiml = await registerOnce();
      } else {
        let inflight = agentRegisterLocks.get(callSid);
        if (!inflight) {
          inflight = registerOnce();
          agentRegisterLocks.set(callSid, inflight);
          inflight.catch(() => {}).finally(() => agentRegisterLocks.delete(callSid));
        } else if (medicalVoiceDebug()) {
          console.log("[medical-voice] coalescing registerCall for Twilio CallSid", callSid);
        }
        twiml = await inflight;
      }

      // HttpResponsePromise unwraps `.then`/await to the parsed body — TwiML string, not `{ data }`.
      const xml = typeof twiml === "string" ? twiml : String(twiml ?? "");
      if (!xml.includes("<")) {
        throw new Error("unexpected registerCall response shape");
      }
      if (!/<\s*connect\b/i.test(xml)) {
        console.warn(
          "[medical-voice] ElevenLabs TwiML has no Connect/Stream verbs — bridging may fail; check ConvAI Twilio docs and μ-law agent settings.",
        );
      }
      const outXml = attachElevenLabsStreamStatusCallback(xml);
      if (medicalVoiceDebug()) {
        console.log("[medical-voice] registerCall TwiML (truncated):\n", outXml.slice(0, 1200));
      }
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.send(outXml);
    } catch (err) {
      console.error("[medical-voice] ElevenLabs registerCall failed:", err?.message || err);
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: "alice" }, "Sorry, the voice assistant cannot connect right now. Please hang up.");
      vr.hangup();
      res.type("text/xml").send(vr.toString());
    }
  }

  app.get("/twilio/voice", handleVoicePlayTwiMl);

  app.post("/twilio/voice", twilioUrlEncoded, handleVoicePlayTwiMl);

  app.get("/twilio/voice/agent", (req, res, next) => {
    Promise.resolve(handleAgentTwiMl(req, res)).catch(next);
  });

  app.post("/twilio/voice/agent", twilioUrlEncoded, (req, res, next) => {
    Promise.resolve(handleAgentTwiMl(req, res)).catch(next);
  });

  app.post("/twilio/voice/status", twilioUrlEncoded, (req, res) => {
    if (!validateTwilioRequest(req)) {
      return res.status(403).type("text/plain").send("");
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const sid = body.CallSid;
    const status = body.CallStatus;
    if (sid) console.log("[medical-voice] status:", status, sid);
    if (sid && status === "completed" && medicalVoiceDebug()) {
      console.log("[medical-voice] twilio completed:", {
        CallSid: body.CallSid,
        ParentCallSid: body.ParentCallSid,
        CallStatus: body.CallStatus,
        CallDuration: body.CallDuration ?? body.Duration,
        Direction: body.Direction,
        SipResponseCode: body.SipResponseCode,
        ErrorCode: body.ErrorCode,
        AnsweredBy: body.AnsweredBy,
        SequenceNumber: body.SequenceNumber,
      });
    }
    res.sendStatus(204);
  });

  app.post(VOICEMAIL_STREAM_STATUS_PATH, twilioUrlEncoded, (req, res) => {
    if (!validateTwilioRequest(req)) {
      return res.status(403).type("text/plain").send("");
    }
    const b = req.body && typeof req.body === "object" ? req.body : {};
    const ev = String(b.StreamEvent || "").toLowerCase();
    const terr = b.StreamError;
    if (ev === "stream-error" || (terr !== undefined && terr !== "")) {
      console.warn(
        "[medical-voice] stream-error (Twilio passes little detail here; ElevenLabs dashboard for this Conversation ID explains policy/codec/agent errors):",
        JSON.stringify(b),
      );
    } else if (medicalVoiceDebug()) {
      console.log("[medical-voice] stream status:", {
        StreamEvent: b.StreamEvent,
        CallSid: b.CallSid,
        StreamSid: b.StreamSid,
      });
    }
    res.sendStatus(204);
  });

  app.get(VOICEMAIL_AUDIO_PATH, (req, res) => {
    const q = req.query?.token;
    const t = typeof q === "string" ? q : Array.isArray(q) ? q[0] : "";
    const ensured = ensureAudioRecord(String(t).trim().toLowerCase());
    if (!ensured) return res.sendStatus(404);
    res.setHeader("Cache-Control", "no-store");
    res.type("audio/mpeg");
    return res.send(ensured.buffer);
  });
}
