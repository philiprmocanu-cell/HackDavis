import crypto from "node:crypto";

/**
 * sms-gate may deliver the **same** inbound SMS many times (new top-level `id` per POST). We dedupe
 * on a **logical** key when `messageId` + `receivedAt` + sender + text exist; otherwise fall back to
 * event id / fingerprint (see `smsReceivedDedupeKey`). When the provider sends a new `messageId` or
 * timestamp on every POST, use **`smsBurstDedupeKey`** + **`SMS_WEBHOOK_BURST_SUPPRESS_MS`** (default
 * 12s) to treat same sender + same text as one burst.
 *
 * If a duplicate arrives **while the primary is still in flight**, respond **503** + **Retry-After**
 * (see server) so the provider retries; an immediate **200** on that duplicate can make the provider
 * stop retrying, and if the primary later fails before `sendSms`, the user never gets an SMS.
 */

const committed = new Map(); // key → expiresAt
const inflight = new Map(); // key → startedAtMs
/** After a successful send, ignore same sender+text for this long (see `smsBurstDedupeKey`). */
const burstCooldownUntil = new Map(); // burstKey → expiresAt

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

function pruneBurstCooldown() {
  const now = Date.now();
  for (const [k, exp] of burstCooldownUntil.entries()) {
    if (exp <= now) burstCooldownUntil.delete(k);
  }
}

/** Ms to suppress duplicate POSTs with same sender + normalized text. Unset → 12000; set to 0 to disable. */
function burstSuppressMs() {
  const raw = process.env.SMS_WEBHOOK_BURST_SUPPRESS_MS;
  if (raw !== undefined && String(raw).trim() !== "") {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(n, 120_000);
  }
  return 12_000;
}

/**
 * Same user + same visible SMS text within the burst window → treat as duplicate fan-out.
 * Uses normalized message only (after your webhook strips segment markers).
 *
 * @param {string} senderRaw payload.sender or phoneNumber (any stable string)
 * @param {string} messageNormalized `normalizeInboundSms` output
 * @returns {string | null} e.g. br:deadbeef…
 */
export function smsBurstDedupeKey(senderRaw, messageNormalized) {
  const ms = burstSuppressMs();
  if (ms <= 0) return null;
  const s = String(senderRaw ?? "").trim();
  const m = String(messageNormalized ?? "").trim();
  if (!s || !m) return null;
  const h = crypto.createHash("sha256").update(`${s}\n${m}`).digest("hex").slice(0, 48);
  return `br:${h}`;
}

/**
 * Dedupe key for one inbound user SMS (one outbound reply).
 *
 * 1. **Logical** — when sms-gate sends `messageId`, `receivedAt`, sender, and `message`: hash those
 *    plus body text. Duplicate POSTs with different top-level `id` share the same key.
 * 2. **Event** `body.id` — when logical fields are incomplete (retries usually reuse `id`).
 * 3. **messageId** alone, then fingerprint — last resort.
 *
 * @param {Record<string, unknown>} body
 * @returns {{ key: string | null }}
 */
export function smsReceivedDedupeKey(body) {
  if (!body || typeof body !== "object") return { key: null };
  const p = /** @type {Record<string, unknown>} */ (body.payload ?? {});

  const sender = String((p.sender ?? p.phoneNumber) ?? "").trim();
  const rawMsg = typeof p.message === "string" ? p.message : "";
  const msgIdRaw = typeof p.messageId === "string" ? p.messageId.trim() : "";
  const receivedAt = typeof p.receivedAt === "string" ? p.receivedAt.trim() : "";

  if (sender && msgIdRaw && receivedAt && rawMsg.trim()) {
    const h = crypto
      .createHash("sha256")
      .update(`${sender}\n${msgIdRaw}\n${receivedAt}\n${rawMsg}`)
      .digest("hex")
      .slice(0, 48);
    return { key: `log:${h}` };
  }

  const evtRaw = typeof body.id === "string" ? body.id.trim() : "";
  if (evtRaw) return { key: `evt:${evtRaw}` };

  if (msgIdRaw) return { key: `mid:${msgIdRaw}` };

  if (!sender || !rawMsg.trim()) return { key: null };

  const h = crypto.createHash("sha256").update(`${sender}\n${receivedAt}\n${rawMsg}`).digest("hex").slice(0, 48);
  return { key: `fp:${h}` };
}

/**
 * Claim processing for key.
 *
 * - **proceed**: this request should run the full handler.
 * - **committed**: same message was already handled successfully — return 200 duplicate.
 * - **inflight**: another request is still running (e.g. slow OpenAI) — return 503 + Retry-After so
 *   the provider retries; otherwise a early 200 on this duplicate can make the provider stop retrying,
 *   and if the primary later fails before `sendSms`, the user never gets an SMS.
 *
 * @param {string | null} key primary dedupe key
 * @param {string | null} [burstKey] from `smsBurstDedupeKey` — optional second axis for provider fan-out
 * @returns {{ status: 'proceed' } | { status: 'duplicate_committed' } | { status: 'duplicate_inflight' }}
 */
export function beginSmsWebhookDedupe(key, burstKey = null) {
  if (!key || dedupDisabled()) return { status: "proceed" };
  const now = Date.now();
  pruneCommitted();
  pruneInflight();
  pruneBurstCooldown();

  if (burstKey) {
    const cool = burstCooldownUntil.get(burstKey) || 0;
    if (cool > now) {
      console.warn("[sms] duplicate suppressed (burst: same sender+text within SMS_WEBHOOK_BURST_SUPPRESS_MS)");
      return { status: "duplicate_committed" };
    }
    const bt = inflight.get(burstKey);
    if (bt !== undefined && now - bt <= inflightTtlMs()) return { status: "duplicate_inflight" };
  }

  if (committed.has(key)) return { status: "duplicate_committed" };
  const t0 = inflight.get(key);
  if (t0 !== undefined && now - t0 <= inflightTtlMs()) return { status: "duplicate_inflight" };

  inflight.set(key, now);
  if (burstKey) inflight.set(burstKey, now);
  return { status: "proceed" };
}

/** Call after outbound SMS succeeds so retries drop without re-sending. */
export function commitSmsWebhookDedupe(key, burstKey = null) {
  if (dedupDisabled()) return;
  if (key) {
    inflight.delete(key);
    committed.set(key, Date.now() + webhookDedupeTtlMs());
  }
  const b = burstKey && burstSuppressMs() > 0 ? burstKey : null;
  if (b) {
    inflight.delete(b);
    burstCooldownUntil.set(b, Date.now() + burstSuppressMs());
  }
}

/** Call on thrown error before SMS so webhook provider can retry legitimately. */
export function rollbackSmsWebhookDedupe(key, burstKey = null) {
  if (dedupDisabled()) return;
  if (key) inflight.delete(key);
  if (burstKey) inflight.delete(burstKey);
}
