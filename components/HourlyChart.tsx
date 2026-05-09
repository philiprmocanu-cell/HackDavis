"use client";

import type { HourlyBucket } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function HourlyChart({ data }: { data: HourlyBucket[] }) {
  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  const formatted = data.map((d) => {
    const dt = new Date(d.hour);
    const label = Number.isNaN(dt.getTime())
      ? d.hour
      : `${pad2(dt.getHours())}:00`;
    return { ...d, label };
  });

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#71717a"
            tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "#27272a" }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#71717a"
            tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "#27272a" }}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "#18181b" }}
            contentStyle={{
              background: "#0a0a0a",
              border: "1px solid #27272a",
              borderRadius: 8,
              color: "#fafafa",
              fontFamily: "var(--font-geist-mono)",
              fontSize: 12,
            }}
            labelStyle={{ color: "#a1a1aa" }}
          />
          <Bar dataKey="count" fill="#fafafa" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-56 flex items-center justify-center text-sm text-zinc-500">
      No messages in the last 24 hours.
    </div>
  );
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}
