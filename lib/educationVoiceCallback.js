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
import { getCurriculumLineByCode } from "./curriculumDirectory.js";

const eduDirname = path.dirname(fileURLToPath(import.meta.url));
const ED_DEFAULT_CONV_PROMPT_PATH = path.join(eduDirname, "..", "education-conversation-agent-prompt.md");

const INLINE_EDU_CONV_FALLBACK =
  "You are a patient curriculum tutor on a phone call. Teach only from the session grounded lesson: one RTK code and directory line. Short turns; check understanding; answer questions within topic; close with actions for today. Simple English unless the user prefers Hindi. No medical diagnosis, dosing, or invented scheme amounts or helplines.".trim();

const twilioUrlEncoded = express.urlencoded({ extended: false });

const ED_VOICEMAIL_AUDIO_PATH = "/twilio/education/audio.mp3";
const ED_VOICEMAIL_VOICE_PATH = "/twilio/education/voice";
const ED_VOICEMAIL_AGENT_PATH = "/twilio/education/voice/agent";
const ED_VOICEMAIL_STREAM_STATUS_PATH = "/twilio/education/voice/stream-status";
const ED_VOICEMAIL_CALL_STATUS_PATH = "/twilio/education/voice/call-status";

const educationAudioByToken = new Map();
const educationConvContextByToken = new Map();
const lastEducationOutboundAt = new Map();
const educationAgentRegisterLocks = new Map();

let elevenLabsEducationLazy = null;

function getElevenLabsClient() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("missing ELEVENLABS_API_KEY");
  elevenLabsEducationLazy ||= new ElevenLabsClient({ apiKey: key });
  return elevenLabsEducationLazy;
}

function eduVoiceEnabled() {
  const v = String(process.env.EDUCATION_VOICE_ENABLED || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** `tts` (default): one-way script TTS. `conversation`: ElevenLabs ConvAI via registerCall. */
function educationVoiceMode() {
  const m = String(process.env.EDUCATION_VOICE_MODE || "tts").trim().toLowerCase();
  if (m === "conversation" || m === "agent" || m === "convai") return "conversation";
  return "tts";
}

function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_CALLER_ID);
}

function ttsConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID);
}

function educationConversationConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_EDUCATION_AGENT_ID);
}

function educationElevenLabsReady() {
  return educationVoiceMode() === "conversation" ? educationConversationConfigured() : ttsConfigured();
}

function basePublicUrl() {
  return String(process.env.PUBLIC_APP_URL || "").replace(/\/$/, "");
}

function educationVoiceDebug() {
  const v = String(process.env.EDUCATION_VOICE_DEBUG || "").toLowerCase();
  return v === "1" || v === "true";
}

function attachEducationStreamStatusCallback(xml) {
  const base = basePublicUrl();
  if (!base || /\bstatusCallback\s*=/i.test(xml)) return xml;
  const cbUrl = `${base}${ED_VOICEMAIL_STREAM_STATUS_PATH}`.replace(/"/g, "");
  return xml.replace(/(<Stream)(\s[^>]*?)(\s*\/?>)/i, (full, tag, attrs, ending) => {
    if (/^\s*\/>/.test(ending)) return full;
    const gap = /\S/.test(attrs) ? " " : "";
    return `${tag}${attrs}${gap}statusCallback="${cbUrl}" statusCallbackMethod="POST"${ending}`;
  });
}

function telephonyDirectionForEducationRegisterCall() {
  // Do not inherit ELEVENLABS_TWILIO_REGISTER_DIRECTION (medical): outbound curriculum dials must stay
  // outbound unless explicitly overridden for this agent — wrong direction often yields immediate 31921.
  const raw = String(process.env.ELEVENLABS_EDUCATION_TWILIO_REGISTER_DIRECTION ?? "outbound")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (raw === "inbound") return ElevenLabs.TelephonyDirection.Inbound;
  return ElevenLabs.TelephonyDirection.Outbound;
}

function resolvedEducationConversationPromptPath() {
  const custom = process.env.EDUCATION_CONVERSATION_PROMPT_MD?.trim();
  if (custom) return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  return ED_DEFAULT_CONV_PROMPT_PATH;
}

function truncateEducationConversationPrompt(s) {
  const rawMax = Number(process.env.EDUCATION_CONV_PROMPT_MAX_CHARS || 32000);
  const max = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 32000;
  if (s.length <= max) return s;
  console.warn("[education-voice] conversation prompt + session exceeded EDUCATION_CONV_PROMPT_MAX_CHARS — truncated");
  return s.slice(0, max);
}

function loadEducationConversationBasePrompt() {
  if (String(process.env.EDUCATION_AGENT_PROMPT_OVERRIDE_OFF || "").toLowerCase() === "1") {
    return INLINE_EDU_CONV_FALLBACK;
  }
  try {
    const p = resolvedEducationConversationPromptPath();
    const t = fs.readFileSync(p, "utf8").trim();
    return t.length > 0 ? t : INLINE_EDU_CONV_FALLBACK;
  } catch {
    console.warn("[education-voice] unreadable conversation prompt:", resolvedEducationConversationPromptPath());
    return INLINE_EDU_CONV_FALLBACK;
  }
}

function educationMergeMarkdownPromptIntoRegisterCall() {
  const v = String(process.env.EDUCATION_CONV_MERGE_MARKDOWN_PROMPT || "").toLowerCase();
  return v === "1" || v === "true";
}

/** Enables API `conversation_config_override.agent.prompt` (off by default — many agents disallow it). */
function educationAllowPromptOverride() {
  const v = String(process.env.EDUCATION_CONV_ALLOW_PROMPT_OVERRIDE || "").toLowerCase();
  return v === "1" || v === "true";
}

/**
 * `conversation_initiation_client_data`: always sends **dynamic_variables** (`rtk_code`, `directory_line`, `user_sms`;
 * plus `merged_lesson_instructions` when merge mode is on and prompt override is off).
 * Sends `conversation_config_override.agent` only when `firstMessage` and/or `EDUCATION_CONV_ALLOW_PROMPT_OVERRIDE=1`.
 *
 * @param {{ code: string; directoryLine: string; userMessage: string }} ctx
 */
function buildEducationConversationInitiationClientData(ctx) {
  const base = educationMergeMarkdownPromptIntoRegisterCall()
    ? loadEducationConversationBasePrompt()
    : INLINE_EDU_CONV_FALLBACK;
  const session = [
    "## This call — grounded lesson (must not contradict)",
    "",
    `- **RTK code:** ${ctx.code}`,
    `- **Directory line:** ${ctx.directoryLine}`,
    `- **User SMS:** ${ctx.userMessage || "(none)"}`,
    "",
    "## Opening (first spoken turn)",
    "Greet briefly; say you are the automated lesson line (not emergency services); state the RTK code and the lesson title from the directory line; ask if they are ready to start.",
    "",
    "Teach interactively within this scope. Follow the tutor instructions above.",
  ].join("\n");

  const full = `${base}\n\n---\n\n${session}`;
  const prompt = truncateEducationConversationPrompt(full);

  const noFirst = String(process.env.EDUCATION_CONV_NO_FIRST_MESSAGE || "").toLowerCase();
  const skipFirst = noFirst === "1" || noFirst === "true";
  const customFirst = String(process.env.EDUCATION_CONV_FIRST_MESSAGE || "").trim();
  const apiFirstRaw = String(process.env.EDUCATION_CONV_API_FIRST_MESSAGE || "").toLowerCase();
  const apiFirst = apiFirstRaw === "1" || apiFirstRaw === "true";
  const defaultFirst = `Hi. This is your automated lesson for ${ctx.code}. I'll go step by step, and you can ask questions anytime. Ready to start?`;
  let firstMessage;
  if (skipFirst) firstMessage = undefined;
  else if (customFirst) firstMessage = customFirst;
  else if (apiFirst) firstMessage = defaultFirst;
  else firstMessage = undefined;

  const allowPrompt = educationAllowPromptOverride();

  /** @type {Record<string, string>} */
  const dynamicVariables = {
    rtk_code: ctx.code,
    directory_line: ctx.directoryLine,
    user_sms: ctx.userMessage || "(none)",
  };

  if (educationMergeMarkdownPromptIntoRegisterCall() && !allowPrompt) {
    dynamicVariables.merged_lesson_instructions = prompt;
  }

  /** @type {{ firstMessage?: string; prompt?: { prompt: string } }} */
  const agent = {};
  if (firstMessage) agent.firstMessage = firstMessage;
  if (allowPrompt) {
    agent.prompt = { prompt };
  }

  const hasAgent = Object.keys(agent).length > 0;

  return {
    ...(hasAgent ? { conversationConfigOverride: { agent } } : {}),
    dynamicVariables,
  };
}

function educationRegisterOmitClientData() {
  const v = String(process.env.EDUCATION_REGISTER_NO_CLIENT_DATA || "").toLowerCase();
  return v === "1" || v === "true";
}

/** Default off: patching `<Stream>` can contribute to Twilio 31921 with some ConvAI legs. Opt in with EDUCATION_STREAM_STATUS_CALLBACK_ON=1. */
function educationStreamStatusInjectOn() {
  const v = String(process.env.EDUCATION_STREAM_STATUS_CALLBACK_ON || "").toLowerCase();
  return v === "1" || v === "true";
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

function pruneEducationConvContext() {
  const now = Date.now();
  for (const [k, v] of educationConvContextByToken.entries()) {
    if (!v || v.expiresAt <= now) educationConvContextByToken.delete(k);
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

function ctxTokenFromRequest(req) {
  const q =
    typeof req.query?.ctx === "string"
      ? req.query.ctx
      : Array.isArray(req.query?.ctx)
        ? req.query.ctx[0]
        : "";
  if (req.method === "POST" && req.body && typeof req.body.ctx === "string") return req.body.ctx.trim();
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

function takeEducationConvContext(tokenRaw) {
  const t = String(tokenRaw || "").trim().toLowerCase();
  if (!/^[a-f0-9]{48}$/.test(t)) return null;
  pruneEducationConvContext();
  const rec = educationConvContextByToken.get(t);
  if (!rec || rec.expiresAt <= Date.now()) {
    educationConvContextByToken.delete(t);
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

const TWILIO_MEDIA_STREAM_AUDIO = "ulaw_8000";

function unwrapElevenLabsData(res) {
  if (res && typeof res === "object" && "data" in res && res.data !== undefined) return res.data;
  return res;
}

/** GET agent — confirms TTS/ASR formats (wrong settings are the usual cause of Twilio 31921 right after answer). */
function scheduleEducationAgentTelephonyFormatCheck(agentIdRaw) {
  const skip = String(process.env.EDUCATION_AGENT_TELEPHONY_CHECK_OFF || "").toLowerCase();
  if (skip === "1" || skip === "true") return;
  const id = String(agentIdRaw || "").trim();
  if (!id) return;
  void (async () => {
    try {
      const eleven = getElevenLabsClient();
      const agent = unwrapElevenLabsData(await eleven.conversationalAi.agents.get(id));
      const label = agent?.name != null ? String(agent.name) : id;
      const cfg = agent?.conversationConfig;
      const ttsFmt =
        cfg?.tts?.agentOutputAudioFormat != null ? String(cfg.tts.agentOutputAudioFormat) : "(missing)";
      const asrFmt =
        cfg?.asr?.userInputAudioFormat != null ? String(cfg.asr.userInputAudioFormat) : "(missing)";
      const ok = ttsFmt === TWILIO_MEDIA_STREAM_AUDIO && asrFmt === TWILIO_MEDIA_STREAM_AUDIO;
      if (ok) {
        console.log(
          `[education-voice] ConvAI agent "${label}" — TTS ${ttsFmt}, ASR ${asrFmt} (Twilio-ready).`,
        );
        return;
      }
      console.warn(
        `[education-voice] ConvAI agent "${label}" — TTS output=${ttsFmt}, ASR input=${asrFmt}. For Twilio, set **both** to ${TWILIO_MEDIA_STREAM_AUDIO} (μ-law 8kHz) in ElevenLabs → Voice + Advanced. Anything else often causes 31921 as soon as the stream connects.`,
      );
    } catch (err) {
      console.warn("[education-voice] ConvAI agent telephony check failed:", err?.message || err);
    }
  })();
}

export function logEducationVoiceConfig() {
  if (!eduVoiceEnabled()) return;
  const missing = [];
  if (!twilioConfigured()) missing.push("Twilio SID, auth token, caller ID");
  const base = basePublicUrl();
  if (!base) missing.push("PUBLIC_APP_URL");
  const mode = educationVoiceMode();
  if (!educationElevenLabsReady()) {
    missing.push(
      mode === "conversation"
        ? "ELEVENLABS_EDUCATION_AGENT_ID (+ ELEVENLABS_API_KEY)"
        : "ELEVENLABS_VOICE_ID (+ ELEVENLABS_API_KEY)",
    );
  }
  if (missing.length) {
    console.warn("[education-voice] enabled but incomplete:", missing.join(", "));
    return;
  }
  const dirN = getCurriculumLineByCode().size;
  if (mode === "conversation") {
    const dir = telephonyDirectionForEducationRegisterCall();
    if (dir === ElevenLabs.TelephonyDirection.Inbound) {
      console.warn(
        "[education-voice] registerCall direction=inbound — ElevenLabs outbound-call flow normally needs outbound; mis-set direction often drops the media stream (31921).",
      );
    }
    const mergeMd = educationMergeMarkdownPromptIntoRegisterCall();
    const allowPo = educationAllowPromptOverride();
    let hint = `register-call: dynamic vars rtk_code, directory_line, user_sms (use {{…}} in ConvAI prompt)`;
    if (mergeMd && !allowPo) hint += "; merge → merged_lesson_instructions";
    if (mergeMd && allowPo) hint += "; merge + prompt override (EDUCATION_CONV_ALLOW_PROMPT_OVERRIDE)";
    if (!mergeMd) hint += `; paste ${path.basename(resolvedEducationConversationPromptPath())} in ConvAI or EDUCATION_CONV_MERGE_MARKDOWN_PROMPT=1`;
    console.log(`[education-voice] mode=conversation — ${hint}. RTK lines: ${dirN}.`);
    scheduleEducationAgentTelephonyFormatCheck(process.env.ELEVENLABS_EDUCATION_AGENT_ID);
  } else {
    console.log(
      `[education-voice] mode=tts — max ${getMaxCallsPerWindow()} calls / ${getRateWindowMs() / 3600000}h / number; directory ${dirN} RTK lines`,
    );
  }
}

/**
 * @param {{ toE164: string; script?: string; lesson?: { code: string; directoryLine: string }; userMessage?: string }} args
 */
export async function maybePlaceEducationVoiceCall(args) {
  const toE164 = String(args?.toE164 || "").trim();
  const mode = educationVoiceMode();
  const lesson = args?.lesson;
  const userMessage = String(args?.userMessage || "").trim();
  const script = String(args?.script || "").trim();

  if (!eduVoiceEnabled() || !twilioConfigured()) return;
  const publicBase = basePublicUrl();
  if (!publicBase) {
    console.warn("[education-voice] PUBLIC_APP_URL missing");
    return;
  }
  if (!toE164.startsWith("+")) return;

  if (mode === "conversation") {
    if (!educationConversationConfigured()) {
      console.warn("[education-voice] conversation mode needs ELEVENLABS_EDUCATION_AGENT_ID");
      return;
    }
    if (!lesson?.code || !lesson?.directoryLine) return;
  } else {
    if (!ttsConfigured() || !script) return;
  }

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

    let twimlUrl;

    if (mode === "conversation") {
      pruneEducationConvContext();
      const ctxToken = crypto.randomBytes(24).toString("hex").toLowerCase();
      const ttlMs = Number(process.env.EDUCATION_CONV_CONTEXT_TTL_MS || 600000);
      educationConvContextByToken.set(ctxToken, {
        code: lesson.code,
        directoryLine: lesson.directoryLine,
        userMessage,
        expiresAt: Date.now() + ttlMs,
      });
      twimlUrl = `${publicBase}${ED_VOICEMAIL_AGENT_PATH}?ctx=${encodeURIComponent(ctxToken)}`;
    } else {
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
      twimlUrl = `${publicBase}${ED_VOICEMAIL_VOICE_PATH}?token=${encodeURIComponent(tokenKey)}`;
    }

    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const educationStatusUrl = `${publicBase}${ED_VOICEMAIL_CALL_STATUS_PATH}`;
      const statusCallbackUrl =
        process.env.TWILIO_EDUCATION_STATUS_CALLBACK_URL?.trim() || educationStatusUrl;
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
              statusCallback: statusCallbackUrl,
              statusCallbackMethod: "POST",
              statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
            }),
      });
      lastEducationOutboundAt.set(toE164, Date.now());
      recordSharedOutboundVoiceSuccess(toE164);
      console.log(`[education-voice] outbound call initiated (mode=${mode})`);
    } catch (err) {
      console.error("[education-voice] Twilio:", err?.message || err);
      if (mode === "conversation") {
        const m = twimlUrl.match(/ctx=([a-f0-9]{48})/i);
        if (m?.[1]) educationConvContextByToken.delete(m[1].toLowerCase());
      } else {
        const m = twimlUrl.match(/token=([a-f0-9]{64})/i);
        if (m?.[1]) educationAudioByToken.delete(m[1].toLowerCase());
      }
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

  async function handleAgentTwiMl(req, res) {
    if (!validateTwilioRequest(req)) {
      return res.status(403).type("text/plain").send("");
    }

    if (educationVoiceMode() !== "conversation") {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: "alice" }, "Curriculum tutor conversation mode is disabled.");
      return res.type("text/xml").send(vr.toString());
    }

    const ctxTok = ctxTokenFromRequest(req).toLowerCase();
    const ctx = takeEducationConvContext(ctxTok);
    if (!ctx) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: "alice" }, "Sorry, this lesson session expired. Text your RTK code again.");
      vr.hangup();
      return res.type("text/xml").send(vr.toString());
    }

    const { fromNumber, toNumber } = twilioFromTo(req);
    if (!fromNumber || !toNumber) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.hangup();
      return res.type("text/xml").send(vr.toString());
    }

    const conversationInitiationClientData = educationRegisterOmitClientData()
      ? undefined
      : buildEducationConversationInitiationClientData({
          code: ctx.code,
          directoryLine: ctx.directoryLine,
          userMessage: ctx.userMessage,
        });

    try {
      const eleven = getElevenLabsClient();
      const agentId = String(process.env.ELEVENLABS_EDUCATION_AGENT_ID || "").trim();
      if (!agentId) throw new Error("ELEVENLABS_EDUCATION_AGENT_ID not set");

      const registerPayload = {
        agentId,
        fromNumber,
        toNumber,
        direction: telephonyDirectionForEducationRegisterCall(),
        ...(conversationInitiationClientData ? { conversationInitiationClientData } : {}),
      };

      const callSid = voiceCallSid(req);
      const registerOnce = () => eleven.conversationalAi.twilio.registerCall(registerPayload);

      let twiml;
      if (!callSid) {
        twiml = await registerOnce();
      } else {
        let inflight = educationAgentRegisterLocks.get(callSid);
        if (!inflight) {
          inflight = registerOnce();
          educationAgentRegisterLocks.set(callSid, inflight);
          inflight.catch(() => {}).finally(() => educationAgentRegisterLocks.delete(callSid));
        } else if (educationVoiceDebug()) {
          console.log("[education-voice] coalescing registerCall for Twilio CallSid", callSid);
        }
        twiml = await inflight;
      }

      const xml = typeof twiml === "string" ? twiml : String(twiml ?? "");
      if (!xml.includes("<")) {
        throw new Error("unexpected registerCall response shape");
      }
      if (!/<\s*connect\b/i.test(xml)) {
        console.warn(
          "[education-voice] ElevenLabs TwiML has no Connect/Stream verbs — check ConvAI Twilio / μ-law settings.",
        );
      }
      const rawXml = attachEducationStreamStatusCallback(xml);
      const outXml = educationStreamStatusInjectOn() ? rawXml : xml;
      if (educationStreamStatusInjectOn() && educationVoiceDebug()) {
        console.log("[education-voice] EDUCATION_STREAM_STATUS_CALLBACK_ON=1 — TwiML Stream patched with statusCallback");
      }
      if (educationVoiceDebug()) {
        console.log("[education-voice] registerCall TwiML (truncated):\n", outXml.slice(0, 1200));
      }
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.send(outXml);
    } catch (err) {
      console.error("[education-voice] ElevenLabs registerCall failed:", err?.message || err);
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: "alice" }, "Sorry, the lesson line cannot connect right now. Please hang up.");
      vr.hangup();
      res.type("text/xml").send(vr.toString());
    }
  }

  app.get(ED_VOICEMAIL_VOICE_PATH, handlePlayTwiMl);
  app.post(ED_VOICEMAIL_VOICE_PATH, twilioUrlEncoded, handlePlayTwiMl);

  app.post(ED_VOICEMAIL_CALL_STATUS_PATH, twilioUrlEncoded, (req, res) => {
    if (!validateTwilioRequest(req)) {
      return res.status(403).type("text/plain").send("");
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const sid = body.CallSid;
    const status = body.CallStatus;
    if (sid) console.log("[education-voice] call status:", status, sid);
    res.sendStatus(204);
  });

  app.get(ED_VOICEMAIL_AGENT_PATH, (req, res, next) => {
    Promise.resolve(handleAgentTwiMl(req, res)).catch(next);
  });
  app.post(ED_VOICEMAIL_AGENT_PATH, twilioUrlEncoded, (req, res, next) => {
    Promise.resolve(handleAgentTwiMl(req, res)).catch(next);
  });

  app.post(ED_VOICEMAIL_STREAM_STATUS_PATH, twilioUrlEncoded, (req, res) => {
    if (!validateTwilioRequest(req)) {
      return res.status(403).type("text/plain").send("");
    }
    const b = req.body && typeof req.body === "object" ? req.body : {};
    const ev = String(b.StreamEvent || "").toLowerCase();
    const terr = b.StreamError;
    if (ev === "stream-error" || (terr !== undefined && terr !== "")) {
      const code = b.StreamErrorCode != null ? String(b.StreamErrorCode) : "";
      console.warn(
        "[education-voice] stream-error" +
          (code
            ? ` (Tw ${code}: ConvAI closed the media WebSocket — see startup line "ConvAI agent … TTS … ASR …" for format mismatch (need ulaw_8000 both); ElevenLabs conversation logs; https://www.twilio.com/docs/api/errors/${code} )`
            : "") +
          ":",
        JSON.stringify(b),
      );
    } else if (educationVoiceDebug()) {
      console.log("[education-voice] stream status:", { StreamEvent: b.StreamEvent, CallSid: b.CallSid });
    }
    res.sendStatus(204);
  });

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