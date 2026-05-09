/**
 * lib/claude.ts — thin wrapper around the Anthropic SDK for the SMS webhook.
 *
 * Hot path: every inbound SMS calls this exactly once, synchronously, before
 * we reply with TwiML. So:
 *   - Use claude-haiku-4-5-20251001 (cheap and fast enough for a Twilio
 *     webhook timeout).
 *   - Send the system prompt with `cache_control: ephemeral` — the prompt is
 *     ~5K characters and reused on every request, so prompt caching is
 *     mandatory for cost/latency.
 *   - Map our StoredMessage[] to the SDK's MessageParam[] shape (only role
 *     and content; we drop ts/lang/segments/costUsd, the model doesn't need
 *     those).
 *   - Strip the trailing [lang:...;chars:...] tag with parseLangTag and
 *     return both the raw and cleaned reply. The webhook sends `cleaned` to
 *     Twilio and stores `cleaned` (along with parsed lang) in Redis.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { StoredMessage } from "./types";
import { buildSystemPromptWithRegister, parseLangTag } from "./prompts";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 400;

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export interface CallClaudeResult {
  rawReply: string;
  reply: string;
  lang?: string;
  chars?: number;
  // SDK's Usage shape — kept opaque on purpose so we don't depend on the
  // exact field names (input_tokens / output_tokens / cache_*).
  usage: unknown;
}

export async function callClaude(
  history: StoredMessage[],
  registerNote?: string,
): Promise<CallClaudeResult> {
  const client = getClient();

  // Map StoredMessage[] -> Anthropic MessageParam[]. Only role+content are
  // sent to the model; ts/lang/segments/costUsd are local bookkeeping.
  const messages = (history ?? [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length > 0)
    .map((m) => ({ role: m.role, content: m.content }));

  const systemText = buildSystemPromptWithRegister(registerNote);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: systemText,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  // Concatenate text blocks (the model should only emit text for SMS).
  let rawReply = "";
  for (const block of response.content) {
    if (block.type === "text") {
      rawReply += block.text;
    }
  }

  const parsed = parseLangTag(rawReply);

  return {
    rawReply,
    reply: parsed.reply,
    lang: parsed.lang,
    chars: parsed.chars,
    usage: response.usage,
  };
}
