import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import express from "express";
import OpenAI from "openai";

import { findRtkInMessage } from "./lib/curriculumDirectory.js";
import {
  attachEducationVoiceRoutes,
  logEducationVoiceConfig,
  maybePlaceEducationVoiceCall,
} from "./lib/educationVoiceCallback.js";
import { generateEducationVoiceScript } from "./lib/educationVoiceScript.js";
import {
  attachMedicalVoiceRoutes,
  logMedicalVoiceConfig,
  maybePlaceMedicalCallback,
} from "./lib/medicalVoiceCallback.js";
import { MEDICAL_ESCALATION_VOICE_CALLBACK, parseModelCompletion } from "./lib/modelJson.js";
import {
  beginSmsWebhookDedupe,
  commitSmsWebhookDedupe,
  rollbackSmsWebhookDedupe,
  smsReceivedDedupeKey,
} from "./lib/smsWebhookDedupe.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MAX_SENTENCES = 3;

/** Short prompt used when `system-prompt.md` is missing and on artifact retry. */
const MINIMAL_JSON_SUFFIX = `

Respond ONLY with valid JSON (no markdown fences): {"sms_reply":"<SMS text>","medical_escalation":"none"}.
The sms_reply value is normal human language only — never filenames, paths, UUIDs, hex digests, or extensions like .rtfd .pdf .ts. Escape inner quotes as \\".
medical_escalation MUST be exactly "none" or "voice_callback". Always use "none" in this short retry path — never trigger a voice callback from here.`;

const MINIMAL_SMS_SYSTEM = `You answer SMS questions only for the general public. Reply in plain language, at most ${MAX_SENTENCES} short sentences.
Never mention source code, files, TypeScript, prompts, developers, line counts, or that anything was written or saved. Answer only what the user asked.${MINIMAL_JSON_SUFFIX}`;

const FALLBACK_SMS_REPLY =
  "Sorry—please send your question again in one short message. I can only reply by SMS text.";

/** Pull sms_reply from JSON or fenced JSON; fall back to raw string if parsing fails. */
function extractSmsReplyPayload(raw) {
  const parsed = parseModelCompletion(raw);
  if (parsed.sms_reply && parsed.sms_reply.length > 0) return parsed.sms_reply;

  let s = String(raw || "").trim();
  if (!s) return "";
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fence) s = fence[1].trim();

  try {
    const obj = JSON.parse(s);
    if (obj && typeof obj.sms_reply === "string") return obj.sms_reply.trim();
  } catch {
    /* try substring JSON */
  }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const obj = JSON.parse(s.slice(start, end + 1));
      if (obj && typeof obj.sms_reply === "string") return obj.sms_reply.trim();
    } catch {
      /* ignore */
    }
  }
  return s;
}

/** Flip phones / carriers often append multipart markers; strip so the model sees clean text. */
function normalizeInboundSms(text) {
  let s = String(text || "")
    .replace(/\(\s*\d+\s*\/\s*\d+\s*\)/g, " ")
    .replace(/\[\s*\d+\s*\/\s*\d+\s*\]/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

/** Looks like a bogus filename / bundle id (e.g. hex.rtfd), not human SMS. */
function looksLikeGarbageFilenameToken(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  if (/\.rtfd\b/i.test(t) || /\.rtf\b/i.test(t)) return true;
  if (/^[a-f0-9]{16,}\.[a-z]{2,12}$/i.test(t)) return true;
  return false;
}

/** Collapse repeated letters to catch typos like wriitend → hint toward written. */
function squashRepeats(s) {
  return s.replace(/(.)\1+/g, "$1");
}

/** True if the model slipped into repo/Cursor/file-writing voice (drop or retry). */
function outputIsBlocked(text) {
  const raw = String(text).replace(/`/g, "");
  const x = raw.toLowerCase();
  if (!x.trim()) return true;

  if (/\bprompts\.ts\b/.test(x) || x.includes("lib/prompts")) return true;
  if (/\btypescript\b/.test(x) || /\.tsx?\b/.test(x)) return true;

  if (/\b\d+\s*lines?\b/.test(x)) return true;
  if (/\bcontain(?:s|ed)?\b[^\n.!?]{0,40}\d+\s*lines?\b/.test(x)) return true;

  const squash = squashRepeats(x);
  const soundsWritten =
    /written|writen|wrote|wri+t+e+n*d+|saved.*file/.test(x) ||
    (/written/.test(squash) && /fil/.test(squash));

  if (/\bfile\b/.test(x) && (soundsWritten || /\d+\s*lines?/.test(x) || /\bcontain/.test(x))) return true;
  if (/was\s+w+[riaetu]{4,18}(?:end|nd)?\b/.test(x)) return true;

  if (
    /have been written|has been written|i have written|written the file|i wrote the file/.test(x) &&
    /prompt|framework|typescript|\.ts|source code|repository|\bcursor\b/.test(x)
  ) {
    return true;
  }
  if (x.includes("response framework") && /written|created|file|lines?/.test(x)) return true;

  if (/\.rtfd\b|\.rtf\b(?![a-z])/i.test(x)) return true;
  if (/\b[a-f0-9]{20,}\.[a-z]{2,12}\b/i.test(raw)) return true;
  if (looksLikeGarbageFilenameToken(raw.trim())) return true;
  return false;
}

/** Drop sentences that echo Cursor/file-writing tasks; strip backticks for SMS. */
function scrubAgentEcho(text) {
  let t = String(text).replace(/`+/g, "");
  const parts = t.split(/(?<=[.!?।])\s+/).filter(Boolean);
  const kept = parts.filter((p) => {
    const x = p.toLowerCase();
    if (/\bprompts\.ts\b/.test(x) || x.includes("lib/prompts")) return false;
    if (/\b\d+\s*lines?\b/.test(x)) return false;
    if (/\bthe file\b/.test(x)) return false;
    if (
      /\bwritten (the )?file\b/.test(x) ||
      x.includes("i have written") ||
      x.includes("has been written") ||
      x.includes("have been written") ||
      x.includes("has been wri") ||
      /contain.*written|written.*contain/.test(x)
    ) {
      return false;
    }
    if (/\d+\s*lines?/.test(x) && (x.includes("line") || x.includes("consists") || x.includes("contain"))) return false;
    if (x.includes("containing the response framework")) return false;
    if (/\btypescript\b/.test(x) || /\.tsx?\b/.test(x)) return false;
    if (/\.rtfd\b|\.rtf\b/i.test(x)) return false;
    if (/\b[a-f0-9]{20,}\.[a-z]{2,12}\b/i.test(x)) return false;
    return true;
  });
  const out = kept.join(" ").trim().replace(/\s+/g, " ");
  return out.length > 0 ? out : FALLBACK_SMS_REPLY;
}

function readMd(name) {
  const p = path.join(__dirname, name);
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    console.warn(`Missing context file: ${name}`);
    return "";
  }
}

function parseLangTag(raw) {
  const re = /\n\[lang:([^;\]]+);chars:(\d+)\]\s*$/;
  const m = raw.match(re);
  if (!m) return { reply: raw.trim() };
  return {
    reply: raw.slice(0, m.index).trim(),
    lang: m[1],
    chars: Number.parseInt(m[2], 10),
  };
}

/** Hard cap: at most `max` sentences (handles . ! ? and Hindi danda). */
function enforceMaxSentences(text, max = MAX_SENTENCES) {
  const t = text.trim();
  if (!t) return t;
  const parts = t.split(/(?<=[.!?।])\s+/).filter(Boolean);
  if (parts.length <= max) return parts.join(" ");
  return parts.slice(0, max).join(" ");
}

function buildDefaultSystemPrompt() {
  let s = readMd("system-prompt.md").trim();
  if (!s) {
    console.warn("system-prompt.md missing; using minimal retry prompt as primary");
    return MINIMAL_SMS_SYSTEM;
  }
  return s.replace(/\{\{MAX_SENTENCES\}\}/g, String(MAX_SENTENCES));
}

const PORT = Number(process.env.PORT || 3000);
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || "/webhook/sms";

function verifySignature(secretKey, rawPayload, timestamp, signature) {
  if (!signature || timestamp == null) return false;
  const message = rawPayload + String(timestamp);
  const expected = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("hex");
  const sig = String(signature).trim().toLowerCase();
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch {
    return false;
  }
}

function normalizeE164(sender) {
  const s = String(sender).replace(/\s/g, "");
  if (!s) return s;
  return s.startsWith("+") ? s : `+${s}`;
}

async function sendSms(phoneNumbers, text) {
  const user = process.env.SMSGATE_CLOUD_USERNAME;
  const pass = process.env.SMSGATE_CLOUD_PASSWORD;
  const base = process.env.SMSGATE_CLOUD_BASE_URL;
  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  const res = await fetch(`${base}/3rdparty/v1/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      textMessage: { text },
      phoneNumbers,
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`SMS send failed ${res.status}: ${body}`);
  return body;
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  }),
);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

attachMedicalVoiceRoutes(app);
attachEducationVoiceRoutes(app);

app.post(WEBHOOK_PATH, async (req, res) => {
  const signingKey = process.env.WEBHOOK_SIGNING_KEY;
  if (signingKey) {
    const sig = req.get("X-Signature");
    const ts = req.get("X-Timestamp");
    if (!verifySignature(signingKey, req.rawBody || "", ts || "", sig || "")) {
      return res.status(401).send("invalid signature");
    }
    const skew = 5 * 60;
    const now = Math.floor(Date.now() / 1000);
    const t = parseInt(String(ts), 10);
    if (!Number.isFinite(t) || Math.abs(now - t) > skew) {
      return res.status(401).send("stale timestamp");
    }
  }

  /** Active dedupe slot for this webhook; rolled back if handler errors before outbound SMS succeeds. */
  let activeDedupeKey = null;

  try {
    const body = req.body;
    if (!body || body.event !== "sms:received") {
      return res.status(200).json({ ok: true, skipped: true });
    }

    const payload = body.payload || {};
    const rawInbound = typeof payload.message === "string" ? payload.message : "";
    const message = normalizeInboundSms(rawInbound);
    const sender = payload.sender ?? payload.phoneNumber;
    if (!sender || !message) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    const { key: dedupeKey } = smsReceivedDedupeKey(body);
    if (!beginSmsWebhookDedupe(dedupeKey)) {
      console.warn("[sms] duplicate webhook skipped (sms-gate retry or concurrent delivery)");
      return res.status(200).json({ ok: true, skipped: true, duplicate: true });
    }
    activeDedupeKey = dedupeKey;

    if (!openai) {
      console.error("OPENAI_API_KEY is not set");
      rollbackSmsWebhookDedupe(activeDedupeKey);
      return res.status(500).json({ error: "missing_openai_key" });
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const maxTok = Number(process.env.OPENAI_MAX_TOKENS || 280);
    const system = [
      buildDefaultSystemPrompt(),
      process.env.OPENAI_SYSTEM_PROMPT ? `\n\n### Operator instructions\n${process.env.OPENAI_SYSTEM_PROMPT}` : "",
    ].join("");

    function finalizeRaw(raw) {
      const extracted = extractSmsReplyPayload((raw || "").trim());
      const trimmed = extracted.trim() || "Sorry, I could not generate a reply.";
      const { reply: withoutTag } = parseLangTag(trimmed);
      let out = scrubAgentEcho(withoutTag);
      out = enforceMaxSentences(out, MAX_SENTENCES);
      const maxChars = Number(process.env.REPLY_MAX_CHARS || 1000);
      if (out.length > maxChars) out = out.slice(0, maxChars);
      return out;
    }

    let completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: message },
      ],
      max_tokens: maxTok,
      response_format: { type: "json_object" },
    });

    let raw = completion.choices[0]?.message?.content?.trim() || "";
    let reply = finalizeRaw(raw);

    if (outputIsBlocked(reply)) {
      console.warn("[sms] artifact detected; retry with minimal system");
      completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: MINIMAL_SMS_SYSTEM },
          { role: "user", content: message },
        ],
        max_tokens: maxTok,
        response_format: { type: "json_object" },
      });
      raw = completion.choices[0]?.message?.content?.trim() || "";
      reply = finalizeRaw(raw);
    }

    if (outputIsBlocked(reply)) {
      console.warn("[sms] artifact after retry; fallback SMS");
      reply = FALLBACK_SMS_REPLY;
    }

    const to = normalizeE164(sender);
    const structured = parseModelCompletion(raw);

    await sendSms([to], reply);
    commitSmsWebhookDedupe(activeDedupeKey);

    const shouldEscalate =
      structured.medical_escalation === MEDICAL_ESCALATION_VOICE_CALLBACK &&
      reply !== FALLBACK_SMS_REPLY;

    if (shouldEscalate) {
      try {
        await maybePlaceMedicalCallback({ toE164: to, smsUserMessage: message });
      } catch (err) {
        console.error("[medical-voice] callback hook:", err?.message || err);
      }
    }

    const rtkMatch = findRtkInMessage(message);
    const skipEducationVoice =
      reply === FALLBACK_SMS_REPLY ||
      structured.medical_escalation === MEDICAL_ESCALATION_VOICE_CALLBACK ||
      shouldEscalate;
    if (rtkMatch && !skipEducationVoice) {
      const eduOn = String(process.env.EDUCATION_VOICE_ENABLED || "").toLowerCase();
      if (eduOn === "1" || eduOn === "true" || eduOn === "yes") {
        try {
          const eduMode = String(process.env.EDUCATION_VOICE_MODE || "tts").trim().toLowerCase();
          const useConversation =
            eduMode === "conversation" || eduMode === "agent" || eduMode === "convai";

          if (useConversation) {
            await maybePlaceEducationVoiceCall({
              toE164: to,
              lesson: { code: rtkMatch.code, directoryLine: rtkMatch.directoryLine },
              userMessage: message,
            });
          } else {
            const script = await generateEducationVoiceScript({
              openai,
              userMessage: message,
              directoryLine: rtkMatch.directoryLine,
              code: rtkMatch.code,
            });
            await maybePlaceEducationVoiceCall({ toE164: to, script });
          }
        } catch (err) {
          console.error("[education-voice] callback hook:", err?.message || err);
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    rollbackSmsWebhookDedupe(activeDedupeKey);
    console.error(err);
    return res.status(500).json({ error: "handler_failed" });
  }
});

app.listen(PORT, () => {
  logMedicalVoiceConfig();
  logEducationVoiceConfig();
  console.log(`Listening on ${PORT}${WEBHOOK_PATH}`);
});
