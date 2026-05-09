/**
 * lib/ratelimit.ts — per-number hourly cap + global daily-USD cap.
 *
 * Two independent rails:
 *
 *   1. Per-number hourly limit. Key is `ratelimit:${phone}:${YYYY-MM-DD-HH}`,
 *      INCR'd on each inbound; the first INCR also gets EXPIRE 3600. Cheap
 *      protection against a single Nokia stuck in a redial loop.
 *
 *   2. Global daily USD spend. Key is `spend:${YYYY-MM-DD}`, INCRBYFLOAT
 *      after every Claude reply with the estimated outbound cost. When this
 *      passes DAILY_USD_CAP we stop calling Claude for the rest of UTC day.
 *      EXPIRE 7 days so the dashboard can chart a week of history.
 *
 * UTC is used everywhere; users across IST get reset at 05:30 IST. The cost
 * isn't worth localising for a $5 cap.
 */
import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (_redis) return _redis;
  _redis = Redis.fromEnv();
  return _redis;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function todayUtcKeyDate(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function nowUtcHourBucket(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}-${pad2(d.getUTCHours())}`;
}

export function spendKey(date?: string): string {
  return `spend:${date ?? todayUtcKeyDate()}`;
}

const PER_NUMBER_DEFAULT = 20;
const DAILY_USD_DEFAULT = 5;

function perNumberHourlyLimit(): number {
  const raw = process.env.PER_NUMBER_HOURLY_LIMIT;
  const n = raw ? Number.parseInt(raw, 10) : PER_NUMBER_DEFAULT;
  return Number.isFinite(n) && n > 0 ? n : PER_NUMBER_DEFAULT;
}

function dailyUsdCap(): number {
  const raw = process.env.DAILY_USD_CAP;
  const n = raw ? Number.parseFloat(raw) : DAILY_USD_DEFAULT;
  return Number.isFinite(n) && n > 0 ? n : DAILY_USD_DEFAULT;
}

export interface RateLimitResult {
  ok: boolean;
  reason?: string;
}

export async function checkRateLimit(phone: string): Promise<RateLimitResult> {
  const redis = getRedis();
  const key = `ratelimit:${phone}:${nowUtcHourBucket()}`;
  const limit = perNumberHourlyLimit();
  const count = await redis.incr(key);
  if (count === 1) {
    // First hit in this hour; set the TTL.
    await redis.expire(key, 3600);
  }
  if (count > limit) {
    return { ok: false, reason: "per_number_hourly_exceeded" };
  }
  return { ok: true };
}

export async function getDailySpend(date?: string): Promise<number> {
  const redis = getRedis();
  const key = spendKey(date);
  const raw = await redis.get<string | number | null>(key);
  if (raw == null) return 0;
  const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
  return Number.isFinite(n) ? n : 0;
}

export async function addDailySpend(usd: number): Promise<void> {
  if (!Number.isFinite(usd) || usd <= 0) return;
  const redis = getRedis();
  const key = spendKey();
  await redis.incrbyfloat(key, usd);
  // 7 days so we can chart a week.
  await redis.expire(key, 7 * 86_400);
}

export async function getCapRemaining(): Promise<number> {
  const cap = dailyUsdCap();
  const spent = await getDailySpend();
  return Math.max(0, cap - spent);
}

export async function isCapExceeded(): Promise<boolean> {
  const cap = dailyUsdCap();
  const spent = await getDailySpend();
  return spent >= cap;
}

export function getDailyUsdCap(): number {
  return dailyUsdCap();
}
