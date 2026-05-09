/**
 * app/api/admin/stats/route.ts — dashboard rollup.
 *
 * One pass over the same conv:* SCAN we use for /admin/conversations,
 * filtering messages by ts >= today (UTC midnight) to count today's
 * inbound/outbound totals, hourly buckets for the last 24h, and the
 * language distribution of today's *assistant* messages.
 *
 * Daily spend is fetched via 7 GETs against `spend:YYYY-MM-DD` keys (cheap
 * compared to the SCAN). DAILY_USD_CAP and capRemainingUsd come from
 * lib/ratelimit.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getConversation, scanConversationKeys } from "@/lib/memory";
import {
  getDailySpend,
  getDailyUsdCap,
  getCapRemaining,
} from "@/lib/ratelimit";
import type {
  StatsResponse,
  HourlyBucket,
  DailyBucket,
  LangBucket,
  StoredMessage,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_KEYS = 500;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function todayUtcMidnightMs(): number {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
}

function isoHour(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:00:00Z`;
}

function utcDateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export async function GET(): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const todayMidnight = todayUtcMidnightMs();
  const now = Date.now();

  // Hourly buckets — last 24h, anchored at the top of the current hour.
  const currentHour = new Date(now);
  currentHour.setUTCMinutes(0, 0, 0);
  const hourStartMs = currentHour.getTime();
  const hourBucketStarts: number[] = [];
  for (let i = 23; i >= 0; i--) {
    hourBucketStarts.push(hourStartMs - i * 3600_000);
  }
  const hourCounts = new Map<number, number>(
    hourBucketStarts.map((s) => [s, 0]),
  );

  let todayMessagesIn = 0;
  let todayMessagesOut = 0;
  const todayUniqueNumbers = new Set<string>();
  const langCounts = new Map<string, number>();

  let keys: string[] = [];
  try {
    keys = await scanConversationKeys(MAX_KEYS);
  } catch (err) {
    console.error("admin/stats: scan failed", err instanceof Error ? err.message : "");
    return NextResponse.json({ error: "scan_failed" }, { status: 500 });
  }

  for (const key of keys) {
    const phone = key.startsWith("conv:") ? key.slice("conv:".length) : key;
    let record;
    try {
      record = await getConversation(phone);
    } catch (err) {
      console.error("admin/stats: get failed", phone, err instanceof Error ? err.message : "");
      continue;
    }
    if (!record) continue;

    const messages = (record.messages ?? []) as StoredMessage[];
    let touchedToday = false;

    for (const m of messages) {
      const ts = m.ts ?? 0;
      if (ts < todayMidnight) continue;

      touchedToday = true;
      if (m.role === "user") {
        todayMessagesIn += 1;
      } else if (m.role === "assistant") {
        todayMessagesOut += 1;
        if (m.lang) {
          langCounts.set(m.lang, (langCounts.get(m.lang) ?? 0) + 1);
        }
      }

      // Bucket into the hour bucket if within last 24h.
      if (ts >= hourBucketStarts[0]) {
        // Find the bucket whose start is the largest <= ts.
        const bucketStart = ts - (ts % 3600_000);
        if (hourCounts.has(bucketStart)) {
          hourCounts.set(bucketStart, (hourCounts.get(bucketStart) ?? 0) + 1);
        }
      }
    }

    if (touchedToday) {
      todayUniqueNumbers.add(record.phone);
    }
  }

  // Daily spend — last 7 days inclusive of today.
  const dailySpend: DailyBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayMs = todayMidnight - i * 86_400_000;
    const date = utcDateKey(dayMs);
    let usd = 0;
    try {
      usd = await getDailySpend(date);
    } catch (err) {
      console.error("admin/stats: spend get failed", date, err instanceof Error ? err.message : "");
    }
    dailySpend.push({ date, usd });
  }

  const todaySpendUsd = dailySpend[dailySpend.length - 1]?.usd ?? 0;
  const dailyCapUsd = getDailyUsdCap();
  let capRemainingUsd = 0;
  try {
    capRemainingUsd = await getCapRemaining();
  } catch {
    capRemainingUsd = Math.max(0, dailyCapUsd - todaySpendUsd);
  }

  const hourlyMessages: HourlyBucket[] = hourBucketStarts.map((start) => ({
    hour: isoHour(start),
    count: hourCounts.get(start) ?? 0,
  }));

  const langDistribution: LangBucket[] = Array.from(langCounts.entries())
    .map(([lang, count]) => ({ lang, count }))
    .sort((a, b) => b.count - a.count);

  const body: StatsResponse = {
    todayMessagesIn,
    todayMessagesOut,
    todayUniqueNumbers: todayUniqueNumbers.size,
    todaySpendUsd,
    dailyCapUsd,
    capRemainingUsd,
    hourlyMessages,
    dailySpend,
    langDistribution,
  };
  return NextResponse.json(body);
}
