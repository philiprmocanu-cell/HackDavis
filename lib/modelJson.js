/**
 * Parse OpenAI completion JSON into structured fields shared by SMS and voice escalation.
 */

export const MEDICAL_ESCALATION_VOICE_CALLBACK = "voice_callback";

/** Extract JSON substring from fenced or loosely wrapped model output */
function coerceJsonSlice(raw) {
  let s = String(raw ?? "").trim();
  if (!s) return "{}";
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) s = s.slice(start, end + 1);
  return s.trim() || "{}";
}

/** @returns {{ sms_reply: string | null; medical_escalation: "none"|"voice_callback"; escalation_note?: string }} */
export function parseModelCompletion(raw) {
  let obj = {};
  try {
    obj = JSON.parse(coerceJsonSlice(raw));
  } catch {
    return { sms_reply: null, medical_escalation: "none" };
  }
  let sms_reply = obj && typeof obj.sms_reply === "string" ? obj.sms_reply.trim() : null;
  if (sms_reply === "") sms_reply = null;
  let medical_escalation = "none";
  if (obj && typeof obj.medical_escalation === "string") {
    const v = obj.medical_escalation.trim();
    if (v === MEDICAL_ESCALATION_VOICE_CALLBACK) medical_escalation = MEDICAL_ESCALATION_VOICE_CALLBACK;
  }
  const escalation_note =
    obj && typeof obj.escalation_note === "string" ? obj.escalation_note.trim() : undefined;
  return {
    sms_reply,
    medical_escalation,
    ...(escalation_note ? { escalation_note } : {}),
  };
}
