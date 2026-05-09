"use client";

import { useState } from "react";
import type { BlockRequest } from "@/lib/types";

export default function BlockToggle({
  phone,
  blocked,
}: {
  phone: string;
  blocked: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    if (busy) return;
    const next = !blocked;
    const verb = next ? "Block" : "Unblock";
    const ok = window.confirm(
      `${verb} ${phone}? ${
        next
          ? "Future messages from this number will be ignored."
          : "This number can text the service again."
      }`,
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const body: BlockRequest = { phone, blocked: next };
      const res = await fetch("/api/admin/block", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(`${verb.toLowerCase()} failed (${res.status})`);
        setBusy(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("network error");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={blocked}
        aria-label={blocked ? "Unblock number" : "Block number"}
        onClick={handleToggle}
        disabled={busy}
        className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-300 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span>{blocked ? "blocked" : "active"}</span>
        <span
          className={[
            "relative inline-flex h-5 w-9 items-center rounded-full border transition",
            blocked
              ? "bg-red-950 border-red-900"
              : "bg-zinc-900 border-zinc-800",
          ].join(" ")}
        >
          <span
            className={[
              "inline-block h-3.5 w-3.5 rounded-full transition-transform",
              blocked
                ? "translate-x-4 bg-red-300"
                : "translate-x-1 bg-zinc-400",
            ].join(" ")}
          />
        </span>
      </button>
      {error && (
        <span className="text-[10px] text-red-400 font-mono">{error}</span>
      )}
    </div>
  );
}
