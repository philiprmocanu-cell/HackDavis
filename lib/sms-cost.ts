/**
 * lib/sms-cost.ts — SMS segment + outbound-cost estimator.
 *
 * Twilio bills per *segment*, not per message. Segment length depends on the
 * encoding the carrier uses:
 *   - GSM-7 (Latin/Hinglish, basic ASCII): 160 chars in a single segment,
 *     153 chars per segment once the message is long enough to be concatenated.
 *   - UCS-2 (Devanagari, Gurmukhi, Tamil, Perso-Arabic, etc.): 70 chars in a
 *     single segment, 67 chars per segment when concatenated.
 *
 * This is a planning estimate for the daily cap and dashboard, not an exact
 * carrier figure — Twilio's actual segment math depends on extension chars
 * and provider behaviour. Close enough for a $5/day cap.
 */
import { isIndicScript } from "./language";

export function estimateSegments(text: string, isUnicode: boolean): number {
  // [...text].length counts unicode code points (emoji + Devanagari matras
  // count more sensibly than .length, which counts UTF-16 code units).
  const len = [...(text ?? "")].length;
  if (len === 0) return 0;

  if (isUnicode) {
    // UCS-2: 70 single, 67 concat
    if (len <= 70) return 1;
    return Math.ceil(len / 67);
  }
  // GSM-7: 160 single, 153 concat
  if (len <= 160) return 1;
  return Math.ceil(len / 153);
}

export function estimateOutboundCostUsd(
  text: string,
  lang?: string,
): { segments: number; usd: number } {
  const isUnicode = isIndicScript(lang);
  const segments = estimateSegments(text ?? "", isUnicode);
  const perSegment = Number.parseFloat(
    process.env.SMS_OUTBOUND_USD_PER_SEGMENT_INDIA ?? "0.0575",
  );
  const rate = Number.isFinite(perSegment) ? perSegment : 0.0575;
  const usd = segments * rate;
  // Round to 6 decimals to keep INCRBYFLOAT well-behaved.
  return { segments, usd: Math.round(usd * 1e6) / 1e6 };
}
