/**
 * lib/twilio.ts — Twilio signature validation + TwiML response building.
 *
 * Twilio signs every webhook with HMAC-SHA1 over the full URL (including the
 * query string Twilio dialed) plus the sorted form-encoded params. We use
 * the SDK's validateRequest helper so we don't reimplement the signing rules
 * from scratch (host header, port, sorted keys, etc.).
 *
 * For the response, we hand-roll a tiny TwiML <Response><Message>...</Message>
 * </Response> string instead of pulling in twilio.twiml.MessagingResponse —
 * we only need one shape and an XML-escape pass.
 */
import twilio from "twilio";

export function validateTwilioSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!authToken || !signature) return false;
  try {
    return twilio.validateRequest(authToken, signature, url, params);
  } catch {
    return false;
  }
}

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export function escapeXml(s: string): string {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch] ?? ch);
}

export function buildTwiML(message: string): string {
  // An empty <Response/> is valid TwiML and tells Twilio "no SMS to send".
  if (!message || message.length === 0) {
    return '<?xml version="1.0" encoding="UTF-8"?><Response/>';
  }
  const body = escapeXml(message);
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${body}</Message></Response>`;
}
