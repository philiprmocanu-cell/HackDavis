import type { StoredMessage } from "@/lib/types";

export default function MessageThread({
  messages,
}: {
  messages: StoredMessage[];
}) {
  if (!messages || messages.length === 0) {
    return (
      <div className="text-sm text-zinc-500 py-8 text-center">
        No messages in this thread.
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {messages.map((m, i) => {
        const isUser = m.role === "user";
        return (
          <li
            key={i}
            className={`flex ${isUser ? "justify-start" : "justify-end"}`}
          >
            <div
              className={[
                "max-w-[80%] flex flex-col gap-1.5 px-4 py-2.5 rounded-xl",
                isUser
                  ? "bg-zinc-900 border border-zinc-900 text-white"
                  : "bg-zinc-950 border border-zinc-800 text-white",
              ].join(" ")}
            >
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
                {isUser ? "user" : "rithik"}
              </div>
              <div className="text-sm whitespace-pre-wrap break-words">
                {m.content}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500 font-mono tabular-nums">
                <span title={new Date(m.ts).toISOString()}>
                  {relativeTime(m.ts)}
                </span>
                {!isUser && m.lang && <Badge>{m.lang}</Badge>}
                {!isUser && typeof m.segments === "number" && (
                  <Badge>
                    {m.segments} seg{m.segments === 1 ? "" : "s"}
                  </Badge>
                )}
                {!isUser && typeof m.costUsd === "number" && (
                  <Badge>${m.costUsd.toFixed(4)}</Badge>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase tracking-wider">
      {children}
    </span>
  );
}

function relativeTime(ts: number): string {
  if (!Number.isFinite(ts)) return "";
  const now = Date.now();
  const diff = now - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}
