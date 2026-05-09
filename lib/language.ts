/**
 * lib/language.ts — language/script helpers shared by the SMS pipeline.
 *
 * The model emits a BCP47-ish tag like `hi-Deva`, `hi-Latn`, `pa-Guru`,
 * `ur-Arab`, etc. We only need to know whether the chosen script is one of
 * the Indic / Perso-Arabic scripts (which encode in UCS-2 over SMS, eating
 * 70 chars per segment) — everything else is treated as Latin (GSM-7).
 */
import { MAX_LEN_INDIC, MAX_LEN_LATIN } from "./prompts";

// Set of script subtags we consider "Indic" for SMS encoding purposes.
// Includes Perso-Arabic (Urdu) since that also encodes as UCS-2 over SMS.
const INDIC_SCRIPTS = new Set<string>([
  "Deva", // Devanagari (Hindi, Marathi)
  "Taml", // Tamil
  "Beng", // Bengali / Assamese
  "Gujr", // Gujarati
  "Knda", // Kannada
  "Mlym", // Malayalam
  "Orya", // Odia
  "Guru", // Gurmukhi (Punjabi)
  "Telu", // Telugu
  "Arab", // Perso-Arabic (Urdu)
]);

// Specific full BCP47-ish tags we explicitly recognise as Indic.
const INDIC_TAGS = new Set<string>([
  "hi-Deva",
  "ta-Taml",
  "bn-Beng",
  "gu-Gujr",
  "kn-Knda",
  "ml-Mlym",
  "or-Orya",
  "pa-Guru",
  "te-Telu",
  "ur-Arab",
  "mr-Deva",
  "as-Beng",
]);

export function isIndicScript(lang?: string): boolean {
  if (!lang || typeof lang !== "string") return false;
  const tag = lang.trim();
  if (tag.length === 0) return false;
  if (INDIC_TAGS.has(tag)) return true;

  // Otherwise inspect the script subtag (after the first `-`).
  const parts = tag.split("-");
  for (const part of parts) {
    if (INDIC_SCRIPTS.has(part)) return true;
  }
  return false;
}

export function maxLenForLang(lang?: string): number {
  return isIndicScript(lang) ? MAX_LEN_INDIC : MAX_LEN_LATIN;
}
