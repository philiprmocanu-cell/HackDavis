import type { ConversationSummary } from "@/lib/types";
import Link from "next/link";
import { maskPhone } from "@/lib/mask";

export default function ConversationList({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  if (!conversations || conversations.length === 0) {
    return (
      <div className="text-sm text-zinc-500 py-8 text-center">
        No conversations yet.
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-zinc-900">
      {conversations.map((c) => {
        const masked = c.phoneMasked || maskPhone(c.phone);
        const href = `/admin/conversation/${encodeURIComponent(c.phone)}`;
        return (
          <li key={c.phone}>
            <Link
              href={href}
              className="block py-3 px-1 hover:bg-zinc-900/40 transition rounded-lg"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono tabular-nums text-sm text-white shrink-0">
                    {masked}
                  </span>
                  {c.primaryLang && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono shrink-0">
                      {c.primaryLang}
                    </span>
                  )}
                  {c.blocked && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-red-950 border border-red-900/60 text-red-300 shrink-0">
                      blocked
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500 font-mono tabular-nums shrink-0">
                  {c.msgCount} msg{c.msgCount === 1 ? "" : "s"}
                </span>
              </div>
              {c.lastMessage && (
                <div className="text-sm text-zinc-400 truncate mt-1">
                  {c.lastMessage}
                </div>
              )}
              {c.registerNote && (
                <div className="text-xs italic text-zinc-500 truncate mt-0.5">
                  {c.registerNote}
                </div>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
