"use client";

import type { DailyBucket } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function SpendChart({ data }: { data: DailyBucket[] }) {
  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#71717a"
            tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "#27272a" }}
            tickFormatter={shortDate}
          />
          <YAxis
            stroke="#71717a"
            tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "#27272a" }}
            tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
            width={64}
          />
          <Tooltip
            cursor={{ stroke: "#3f3f46", strokeDasharray: "2 2" }}
            contentStyle={{
              background: "#0a0a0a",
              border: "1px solid #27272a",
              borderRadius: 8,
              color: "#fafafa",
              fontFamily: "var(--font-geist-mono)",
              fontSize: 12,
            }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(v) => [`$${Number(v).toFixed(4)}`, "spend"]}
          />
          <Line
            type="monotone"
            dataKey="usd"
            stroke="#fafafa"
            strokeWidth={2}
            dot={{ r: 2.5, stroke: "#fafafa", fill: "#0a0a0a" }}
            activeDot={{ r: 4, stroke: "#fafafa", fill: "#fafafa" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-56 flex items-center justify-center text-sm text-zinc-500">
      No spend in the last 7 days.
    </div>
  );
}

function shortDate(d: string): string {
  // Expect "YYYY-MM-DD"; show "MM-DD".
  if (!d) return d;
  const m = d.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}`;
  return d;
}
