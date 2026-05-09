import type { StatsResponse } from "@/lib/types";

export default function StatsCards({ stats }: { stats: StatsResponse }) {
  const cap = stats.dailyCapUsd > 0 ? stats.dailyCapUsd : 1;
  const used = Math.min(stats.todaySpendUsd, stats.dailyCapUsd);
  const usedPct = Math.max(0, Math.min(100, (used / cap) * 100));

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card label="Inbound today" value={fmtInt(stats.todayMessagesIn)} />
      <Card label="Outbound today" value={fmtInt(stats.todayMessagesOut)} />
      <Card label="Unique numbers" value={fmtInt(stats.todayUniqueNumbers)} />
      <Card
        label="Spend today"
        value={
          <span>
            {fmtUsd(stats.todaySpendUsd)}
            <span className="text-zinc-500 text-base font-normal">
              {" / "}
              {fmtUsd(stats.dailyCapUsd)}
            </span>
          </span>
        }
        footer={
          <div className="flex flex-col gap-1">
            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-[width]"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono tabular-nums">
              {fmtUsd(stats.capRemainingUsd)} remaining
            </div>
          </div>
        }
      />
    </div>
  );
}

function Card({
  label,
  value,
  footer,
}: {
  label: string;
  value: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 hover:border-zinc-700 transition">
      <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <span className="text-3xl font-mono font-semibold tabular-nums text-white leading-none">
        {value}
      </span>
      {footer && <div>{footer}</div>}
    </div>
  );
}

function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("en-US");
}

function fmtUsd(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}
