/**
 * lib/memory.ts — Redis-backed conversation store.
 *
 * One key per user phone (`conv:${E164}`) holding a single JSON
 * ConversationRecord. Last 16 messages are kept, older ones rolled off so
 * the system prompt + history stays well under Haiku's context (and our
 * SMS bill stays sane). TTL is refreshed on every write — a number that
 * goes silent for >24h drops out of Redis entirely. Lifetime in/out
 * counters (totalIn/totalOut) increment forever, untouched by the cap.
 *
 * @upstash/redis is HTTP-based, so all ops are awaitable and there's no
 * connection lifecycle to worry about (good fit for serverless route
 * handlers).
 */
import { Redis } from "@upstash/redis";
import type { ConversationRecord, StoredMessage } from "./types";

const TTL_SECONDS = 86_400; // 24h
const MAX_MESSAGES = 16;

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (_redis) return _redis;
  _redis = Redis.fromEnv();
  return _redis;
}

function convKey(phone: string): string {
  return `conv:${phone}`;
}

export async function getConversation(
  phone: string,
): Promise<ConversationRecord | null> {
  const redis = getRedis();
  // Upstash auto-deserialises JSON-stringified values; the SDK returns the
  // parsed object directly when we declare the generic. If something stored
  // a stringified JSON anyway, fall back to JSON.parse.
  const raw = await redis.get<ConversationRecord | string>(convKey(phone));
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ConversationRecord;
    } catch {
      return null;
    }
  }
  return raw as ConversationRecord;
}

async function writeConversation(
  phone: string,
  record: ConversationRecord,
): Promise<void> {
  const redis = getRedis();
  await redis.set(convKey(phone), JSON.stringify(record), { ex: TTL_SECONDS });
}

export async function appendMessages(
  phone: string,
  userMsg: StoredMessage,
  assistantMsg: StoredMessage,
): Promise<ConversationRecord> {
  const now = Date.now();
  const existing = await getConversation(phone);

  const base: ConversationRecord = existing ?? {
    phone,
    messages: [],
    createdAt: now,
    updatedAt: now,
    totalIn: 0,
    totalOut: 0,
  };

  const combined = [...(base.messages ?? []), userMsg, assistantMsg];
  // Cap at MAX_MESSAGES *most recent* messages.
  const messages = combined.slice(-MAX_MESSAGES);

  const updated: ConversationRecord = {
    ...base,
    phone,
    messages,
    updatedAt: now,
    totalIn: (base.totalIn ?? 0) + 1,
    totalOut: (base.totalOut ?? 0) + 1,
  };

  await writeConversation(phone, updated);
  return updated;
}

export async function clearConversation(phone: string): Promise<void> {
  const now = Date.now();
  const existing = await getConversation(phone);
  const base: ConversationRecord = existing ?? {
    phone,
    messages: [],
    createdAt: now,
    updatedAt: now,
    totalIn: 0,
    totalOut: 0,
  };

  const cleared: ConversationRecord = {
    phone,
    messages: [],
    blocked: base.blocked,
    createdAt: base.createdAt,
    updatedAt: now,
    totalIn: base.totalIn ?? 0,
    totalOut: base.totalOut ?? 0,
    // Drop registerNote on reset — the user is starting fresh, so re-derive it.
  };

  await writeConversation(phone, cleared);
}

export async function setBlocked(
  phone: string,
  blocked: boolean,
): Promise<void> {
  const now = Date.now();
  const existing = await getConversation(phone);
  const base: ConversationRecord = existing ?? {
    phone,
    messages: [],
    createdAt: now,
    updatedAt: now,
    totalIn: 0,
    totalOut: 0,
  };

  const updated: ConversationRecord = {
    ...base,
    phone,
    blocked,
    updatedAt: now,
  };

  await writeConversation(phone, updated);
}

export async function setRegisterNote(
  phone: string,
  note: string,
): Promise<void> {
  const now = Date.now();
  const existing = await getConversation(phone);
  const base: ConversationRecord = existing ?? {
    phone,
    messages: [],
    createdAt: now,
    updatedAt: now,
    totalIn: 0,
    totalOut: 0,
  };

  const updated: ConversationRecord = {
    ...base,
    phone,
    registerNote: note,
    updatedAt: now,
  };

  await writeConversation(phone, updated);
}

/**
 * Scan up to `limit` keys matching `conv:*`. Used by admin routes to list
 * all conversations.  Caller still has to GET each key.
 */
export async function scanConversationKeys(
  limit = 200,
): Promise<string[]> {
  const redis = getRedis();
  const keys: string[] = [];
  let cursor: string | number = 0;
  // Cap iterations defensively in case the cursor never returns "0".
  for (let i = 0; i < 50 && keys.length < limit; i++) {
    const result: [string, string[]] = await redis.scan(cursor, {
      match: "conv:*",
      count: 200,
    });
    const next = result[0];
    const batch = result[1];
    for (const k of batch) {
      keys.push(k);
      if (keys.length >= limit) break;
    }
    if (next === "0") break;
    cursor = next;
  }
  return keys;
}
