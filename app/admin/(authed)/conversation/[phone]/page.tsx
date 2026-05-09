import type { ConversationDetailResponse } from "@/lib/types";
import { adminFetch } from "@/lib/admin-fetch";
import { redirect } from "next/navigation";
import Link from "next/link";
import MessageThread from "@/components/MessageThread";
import ResetButton from "@/components/ResetButton";
import BlockToggle from "@/components/BlockToggle";
import { maskPhone } from "@/lib/mask";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ phone: string }>;
}) {
  const { phone: phoneParam } = await params;
  // The route param is URI-encoded ("+" → "%2B") so we restore it.
  const phone = decodeURIComponent(phoneParam);
  const encoded = encodeURIComponent(phone);

  const res = await adminFetch(`/api/admin/conversations/${encoded}`);
  if (res.status === 401) redirect("/admin/login");

  if (res.status === 404) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/admin"
          className="text-xs uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300"
        >
          ← back to dashboard
        </Link>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 text-zinc-400">
          No conversation for {maskPhone(phone)}.
        </div>
      </div>
    );
  }

  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/admin"
          className="text-xs uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300"
        >
          ← back to dashboard
        </Link>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8">
          <div className="text-sm text-red-400">
            Failed to load conversation ({res.status}).
          </div>
        </div>
      </div>
    );
  }

  const data: ConversationDetailResponse = await res.json();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        className="text-xs uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300"
      >
        ← back to dashboard
      </Link>

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl">
        <div className="px-5 py-4 border-b border-zinc-900 flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="font-mono tabular-nums text-lg text-white">
                {data.phoneMasked || maskPhone(data.phone)}
              </span>
              {data.blocked && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-red-950 border border-red-900/60 text-red-300">
                  blocked
                </span>
              )}
            </div>
            {data.registerNote && (
              <span className="italic text-zinc-500 text-sm">
                {data.registerNote}
              </span>
            )}
            <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono tabular-nums mt-1">
              <span>in {data.totalIn}</span>
              <span>·</span>
              <span>out {data.totalOut}</span>
              <span>·</span>
              <span>
                updated {new Date(data.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BlockToggle phone={data.phone} blocked={Boolean(data.blocked)} />
            <ResetButton phone={data.phone} />
          </div>
        </div>
        <div className="p-5">
          <MessageThread messages={data.messages} />
        </div>
      </div>
    </div>
  );
}
