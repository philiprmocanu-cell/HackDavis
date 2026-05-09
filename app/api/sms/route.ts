/**
 * app/api/sms/route.ts — Twilio inbound-SMS webhook.
 *
 * Hot path:
 *   1. Validate X-Twilio-Signature against the raw form body.
 *   2. Pull `From` (E.164) + `Body`.
 *   3. STOP/UNSUBSCRIBE → empty TwiML, let Twilio handle the carrier opt-out.
 *      RESET → wipe conversation, ack in plain English.
 *   4. Blocked number → silent (empty TwiML).
 *   5. Per-number hourly limit. Global daily $ cap. Both reply with a short
 *      English notice and skip Claude.
 *   6. Append user msg, call Claude (Haiku 4.5) with the cached system
 *      prompt + register note, stash the assistant reply, charge the
 *      daily-spend counter.
 *   7. Always return valid TwiML XML — Twilio retries on non-2xx, which we
 *      do NOT want for an SMS-billing service.
 *
 * Secrets are never logged. Errors are caught and converted into a generic
 * empty TwiML so the user doesn't see a 500 page in their SMS inbox.
 */
import type { NextRequest } from "next/server";
import {
  validateTwilioSignature,
  buildTwiML,
} from "@/lib/twilio";
import {
  getConversation,
  appendMessages,
  clearConversation,
} from "@/lib/memory";
import { callClaude } from "@/lib/claude";
import {
  checkRateLimit,
  isCapExceeded,
  addDailySpend,
} from "@/lib/ratelimit";
import { estimateOutboundCostUsd } from "@/lib/sms-cost";
import { sendSmsViaMsg91 } from "@/lib/msg91";
import type { StoredMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function twimlResponse(message: string): Response {
  return new Response(buildTwiML(message), {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function emptyTwimlResponse(): Response {
  return twimlResponse("");
}

function reconstructWebhookUrl(req: NextRequest): string {
  // Prefer the originally-dialed URL Twilio used. In serverless deployments
  // (Vercel), x-forwarded-* gives us the public-facing host/proto, while
  // req.url is the internal next URL. We rebuild the public URL so the
  // signature math matches what Twilio computed.
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (fromEnv ? new URL(fromEnv).protocol.replace(":", "") : "https");
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    (fromEnv ? new URL(fromEnv).host : "");
  const url = new URL(req.url);
  return `${proto}://${host}${url.pathname}${url.search ?? ""}`;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error("sms: TWILIO_AUTH_TOKEN missing");
      return emptyTwimlResponse();
    }

    // Read raw body once, parse as URL-encoded form.
    const rawBody = await req.text();
    const params: Record<string, string> = {};
    const sp = new URLSearchParams(rawBody);
    for (const [k, v] of sp.entries()) {
      params[k] = v;
    }

    const signature = req.headers.get("x-twilio-signature");
    const url = reconstructWebhookUrl(req);

    if (!validateTwilioSignature(authToken, signature, url, params)) {
      console.warn("sms: bad twilio signature");
      return new Response("forbidden", { status: 403 });
    }

    const from = (params.From ?? "").trim();
    const body = (params.Body ?? "").trim();

    if (!from) {
      // Nothing actionable; ack with empty TwiML.
      return emptyTwimlResponse();
    }

    // STOP/UNSUBSCRIBE — let Twilio handle the carrier opt-out. We must NOT
    // send another Message back, so empty Response.
    if (/^stop$/i.test(body) || /^unsubscribe$/i.test(body)) {
      return emptyTwimlResponse();
    }

    // RESET — wipe history, ack short.
    if (/^reset$/i.test(body)) {
      try {
        await clearConversation(from);
      } catch (err) {
        console.error("sms: reset failed", err instanceof Error ? err.message : "");
      }
      return twimlResponse("Conversation reset. Ask me anything.");
    }

    // Look up conversation early so we can honour `blocked` before doing
    // anything more expensive.
    let convo = await getConversation(from);
    if (convo?.blocked) {
      // Silent — pretend the message vanished.
      return emptyTwimlResponse();
    }

    if (!body) {
      // Empty body after trim — nothing to ask Claude.
      return emptyTwimlResponse();
    }

    // Per-number hourly limit. Friendly nudge in plain English.
    const rl = await checkRateLimit(from);
    if (!rl.ok) {
      return twimlResponse("Slow down — try again in an hour.");
    }

    // Global daily USD cap. We refuse to call Claude past this.
    if (await isCapExceeded()) {
      return twimlResponse("Service paused for today, sorry.");
    }

    const ts = Date.now();
    const userMsg: StoredMessage = {
      role: "user",
      content: body,
      ts,
    };

    const history: StoredMessage[] = [
      ...((convo?.messages ?? []) as StoredMessage[]),
      userMsg,
    ];

    let cleanedReply = "";
    let lang: string | undefined;
    try {
      const result = await callClaude(history, convo?.registerNote);
      cleanedReply = result.reply ?? "";
      lang = result.lang;
    } catch (err) {
      console.error("sms: claude call failed", err instanceof Error ? err.message : "");
      // Don't retry — return empty TwiML so Twilio drops the message
      // gracefully. The user can re-text.
      return emptyTwimlResponse();
    }

    if (!cleanedReply || cleanedReply.length === 0) {
      // Model returned nothing — don't bill, don't store.
      return emptyTwimlResponse();
    }

    const { segments, usd } = estimateOutboundCostUsd(cleanedReply, lang);

    const assistantMsg: StoredMessage = {
      role: "assistant",
      content: cleanedReply,
      ts: Date.now(),
      lang,
      segments,
      costUsd: usd,
    };

    try {
      await appendMessages(from, userMsg, assistantMsg);
    } catch (err) {
      console.error("sms: redis append failed", err instanceof Error ? err.message : "");
      // Continue — we'd rather reply once than lose the message.
    }

    try {
      await addDailySpend(usd);
    } catch (err) {
      console.error("sms: spend update failed", err instanceof Error ? err.message : "");
    }

    // Send reply via MSG91 for guaranteed Indian delivery
    await sendSmsViaMsg91(from, cleanedReply);
    return emptyTwimlResponse();
  } catch (err) {
    console.error("sms: unexpected error", err instanceof Error ? err.message : "");
    return emptyTwimlResponse();
  }
}
