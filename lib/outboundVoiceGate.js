/** Shared across medical + education voice: one in-flight dial per E.164, optional global min gap after any successful voice. */

const inFlight = new Set();
const lastSuccessAt = new Map();

export function beginSharedOutboundVoiceDial(normalizedE164) {
  if (inFlight.has(normalizedE164)) return false;
  inFlight.add(normalizedE164);
  return true;
}

export function endSharedOutboundVoiceDial(normalizedE164) {
  inFlight.delete(normalizedE164);
}

export function recordSharedOutboundVoiceSuccess(normalizedE164) {
  lastSuccessAt.set(normalizedE164, Date.now());
}

export function allowSharedOutboundVoiceMinGap(normalizedE164) {
  const ms = Number(process.env.OUTBOUND_VOICE_GLOBAL_MIN_INTERVAL_MS);
  if (!Number.isFinite(ms) || ms <= 0) return true;
  const last = lastSuccessAt.get(normalizedE164) || 0;
  if (Date.now() - last < ms) {
    console.warn(
      `[outbound-voice] skip: OUTBOUND_VOICE_GLOBAL_MIN_INTERVAL_MS (${ms}ms) not met for callee`,
    );
    return false;
  }
  return true;
}
