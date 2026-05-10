/** In-memory per-callee cap on assistant SMS replies (same Node process until restart). */

const sendTimestampsByPhone = new Map(); // E.164 → number[] (ms)
const notifiedQuotaExceeded = new Set(); // E.164 — sent “limit reached” once per over-quota streak

export function smsPhoneQuotaConfigured() {
  const off = String(process.env.SMS_PER_PHONE_QUOTA_OFF || "").toLowerCase();
  if (off === "1" || off === "true" || off === "yes") return false;
  const max = getMaxPerPhone();
  return max > 0;
}

function getMaxPerPhone() {
  const n = Number(process.env.SMS_PER_PHONE_MAX_MESSAGES);
  if (!Number.isFinite(n) || n < 0) return 6;
  return n;
}

/** `0` = no time pruning (cap is total sends this process lifetime). Else rolling window ms. */
function getWindowMs() {
  const raw = process.env.SMS_PER_PHONE_WINDOW_MS;
  if (raw !== undefined && String(raw).trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

function pruneTimestamps(phone, now) {
  const win = getWindowMs();
  let arr = sendTimestampsByPhone.get(phone) || [];
  if (win > 0) {
    arr = arr.filter((t) => now - t < win);
    sendTimestampsByPhone.set(phone, arr);
  } else {
    sendTimestampsByPhone.set(phone, arr);
  }
  if (arr.length < getMaxPerPhone()) notifiedQuotaExceeded.delete(phone);
  return arr;
}

/**
 * @param {string} toE164 normalized +E.164
 * @returns {{ allowed: boolean; used: number; max: number; windowMs: number }}
 */
export function smsPhoneQuotaStatus(toE164) {
  const phone = String(toE164 || "").trim();
  const max = getMaxPerPhone();
  const now = Date.now();
  if (!phone || max <= 0) return { allowed: true, used: 0, max, windowMs: getWindowMs() };

  const arr = pruneTimestamps(phone, now);
  const used = arr.length;
  return { allowed: used < max, used, max, windowMs: getWindowMs() };
}

/** Call once after a normal assistant reply is queued successfully. */
export function smsPhoneQuotaRecordOutbound(toE164) {
  if (!smsPhoneQuotaConfigured()) return;
  const phone = String(toE164 || "").trim();
  const max = getMaxPerPhone();
  if (!phone || max <= 0) return;
  const now = Date.now();
  const arr = pruneTimestamps(phone, now);
  arr.push(now);
  sendTimestampsByPhone.set(phone, arr);
}

export function defaultQuotaExceededMessage() {
  const raw = process.env.SMS_QUOTA_EXCEEDED_TEXT;
  if (typeof raw === "string" && raw.trim()) return raw.trim().slice(0, 500);
  return "Is line ki message limit poori ho chuki hai (6). Baad mein dubara koshish karein ya help ke liye local helpline dhoondhein.";
}

export function canSendQuotaExceededNotice(phone) {
  const off = String(process.env.SMS_QUOTA_EXCEEDED_NOTIFY_OFF || "").toLowerCase();
  if (off === "1" || off === "true") return false;
  return !notifiedQuotaExceeded.has(phone);
}

export function markQuotaExceededNotified(phone) {
  notifiedQuotaExceeded.add(phone);
}
