import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROMPT = path.join(__dirname, "..", "education-voice-prompt.md");

function promptPath() {
  const custom = process.env.EDUCATION_VOICE_PROMPT_MD?.trim();
  if (custom) return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  return DEFAULT_PROMPT;
}

export function readEducationVoiceSystemPrompt() {
  try {
    return fs.readFileSync(promptPath(), "utf8").trim();
  } catch {
    console.warn("[education-voice] missing prompt file:", promptPath());
    return "";
  }
}

function defaultLangInstruction() {
  const v = String(process.env.EDUCATION_VOICE_DEFAULT_LANG || "en").trim().toLowerCase();
  if (v === "hi" || v === "hindi") {
    return "Write the entire spoken script in Hindi (spoken standard, respectful aap), unless the user SMS is clearly English-only and asks for English—then use simple English.";
  }
  return "Write the entire spoken script in simple English unless the user SMS is mainly Devanagari, explicitly requests Hindi, or is clearly Hinglish—then use that one language throughout.";
}

/**
 * @param {{ openai: import("openai").default; userMessage: string; directoryLine: string; code: string }} args
 */
export async function generateEducationVoiceScript(args) {
  const { openai, userMessage, directoryLine, code } = args;
  const system = readEducationVoiceSystemPrompt();
  if (!system) throw new Error("education_voice_prompt_missing");

  const model = process.env.EDUCATION_OPENAI_MODEL?.trim() || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const maxTok = Number(process.env.EDUCATION_OPENAI_MAX_TOKENS || 2800);

  const user = [
    `Canonical code: ${code}`,
    `Authoritative curriculum directory line (teach only what fits this line; expand with pedagogy and examples):`,
    directoryLine,
    "",
    `User SMS (verbatim):`,
    userMessage,
    "",
    defaultLangInstruction(),
    "",
    "Output ONLY the full spoken script for TTS. No headings, no markdown, no JSON. One primary language for the whole script.",
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: maxTok,
  });

  let text = completion.choices[0]?.message?.content?.trim() || "";
  text = text.replace(/^["']|["']$/g, "").trim();
  const maxChars = Number(process.env.EDUCATION_VOICE_MAX_SCRIPT_CHARS || 14000);
  if (text.length > maxChars) text = text.slice(0, maxChars);
  if (!text) throw new Error("education_voice_empty_script");
  return text;
}
