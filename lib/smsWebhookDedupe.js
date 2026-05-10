import crypto from "node:crypto";

/**
 * sms-gate.app retries webhook POSTs unless 2xx within ~30s. Slow OpenAI can cause duplicate inbound
 * webhooks → duplicate outbound SMS. Deduplicate by messageId / delivery id when present.
 */

const committed = new Map(); // key → expiresAt
const inflight = new Map(); // key → startedAtMs

function dedupDisabled() {
  const v = String(process.env.SMS_WEBHOOK_DEDUP_OFF || "").toLowerCase();
  return v === "1" || v === "true";
}

export function webhookDedupeTtlMs() {
  const n = Number(process.env.SMS_WEBHOOK_DEDUP_TTL_MS);
  return Number.isFinite(n) && n > 0 ? n : 48 * 60 * 60 * 1000;
}

function inflightTtlMs() {
  const n = Number(process.env.SMS_WEBHOOK_DEDUP_INFLIGHT_MS);
  return Number.isFinite(n) && n > 0 ? n : 120_000;
}

function pruneCommitted() {
  const now = Date.now();
  for (const [k, exp] of committed.entries()) {
    if (exp <= now) committed.delete(k);
  }
}

function pruneInflight() {
  const now = Date.now();
  const maxHold = inflightTtlMs();
  for (const [k, t0] of inflight.entries()) {
    if (now - t0 > maxHold) inflight.delete(k);
  }
}

/**
 * Normalize inbound webhook body shape from sms-gate (see docs).
 *
 * @param {Record<string, unknown>} body
 * @returns {{ key: string | null }}
 */
export function smsReceivedDedupeKey(body) {
  if (!body || typeof body !== "object") return { key: null };
  const p = /** @type {Record<string, unknown>} */ (body.payload ?? {});
  const msgIdRaw = typeof p.messageId === "string" ? p.messageId.trim() : "";
  if (msgIdRaw) return { key: `mid:${msgIdRaw}` };

  const evtRaw = typeof body.id === "string" ? body.id.trim() : "";
  if (evtRaw) return { key: `evt:${evtRaw}` };

  const sender = String((p.sender ?? p.phoneNumber) ?? "").trim();
  const rawMsg = typeof p.message === "string" ? p.message : "";
  const receivedAt = typeof p.receivedAt === "string" ? p.receivedAt.trim() : "";
  if (!sender || !rawMsg.trim()) return { key: null };

  const h = crypto.createHash("sha256").update(`${sender}\n${receivedAt}\n${rawMsg}`).digest("hex").slice(0, 48);
  return { key: `fp:${h}` };
}

/**
 * Claim processing for key; duplicate concurrent or retried deliveries return false (skip entirely).
 *
 * @param {string | null} key
 * @returns {boolean} true when this invocation should proceed
 */
export function beginSmsWebhookDedupe(key) {
  if (!key || dedupDisabled()) return true;
  const now = Date.now();
  pruneCommitted();
  pruneInflight();

  if (committed.has(key)) return false;
  const t0 = inflight.get(key);
  if (t0 !== undefined && now - t0 <= inflightTtlMs()) return false;

  inflight.set(key, now);
  return true;
}

/** Call after outbound SMS succeeds so retries drop without re-sending. */
export function commitSmsWebhookDedupe(key) {
  if (!key || dedupDisabled()) return;
  inflight.delete(key);
  committed.set(key, Date.now() + webhookDedupeTtlMs());
}

/** Call on thrown error before SMS so webhook provider can retry legitimately. */
export function rollbackSmsWebhookDedupe(key) {
  if (!key || dedupDisabled()) return;
  inflight.delete(key);
}
