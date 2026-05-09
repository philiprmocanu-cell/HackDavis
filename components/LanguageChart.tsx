"use client";

import type { LangBucket } from "@/lib/types";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

// Neutral grayscale palette to stay on-brand. Order matters — most-frequent
// language gets the brightest slice.
const PALETTE = [
  "#fafafa",
  "#a1a1aa",
  "#71717a",
  "#52525b",
  "#3f3f46",
  "#27272a",
];

export default function LanguageChart({ data }: { data: LangBucket[] }) {
  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  const total = data.reduce((sum, d) => sum + (d.count || 0), 0);
  if (total === 0) return <EmptyState />;

  const sorted = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={sorted}
            dataKey="count"
            nameKey="lang"
            cx="50%"
            cy="50%"
            innerRadius={42}
            outerRadius={72}
            stroke="#0a0a0a"
            strokeWidth={2}
            label={(entry) => {
              const e = entry as unknown as {
                lang?: string;
                count?: number;
              };
              const lang = e.lang ?? "?";
              const count = Number(e.count ?? 0);
              const pct = Math.round((count / total) * 100);
              return `${lang} ${pct}%`;
            }}
            labelLine={false}
            isAnimationActive={false}
          >
            {sorted.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#0a0a0a",
              border: "1px solid #27272a",
              borderRadius: 8,
              color: "#fafafa",
              fontFamily: "var(--font-geist-mono)",
              fontSize: 12,
            }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(v, n) => [String(v), String(n)]}
          />
          <Legend
            wrapperStyle={{
              fontSize: 11,
              fontFamily: "var(--font-geist-mono)",
              color: "#a1a1aa",
            }}
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-56 flex items-center justify-center text-sm text-zinc-500">
      No language data yet.
    </div>
  );
}
