"use client";

import { useState } from "react";
import type { ResetRequest } from "@/lib/types";

export default function ResetButton({ phone }: { phone: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (busy) return;
    const ok = window.confirm(
      `Reset history for ${phone}? This wipes the message history and register note. The user can keep texting after.`,
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const body: ResetRequest = { phone };
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(`reset failed (${res.status})`);
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
        onClick={handleClick}
        disabled={busy}
        className="text-xs uppercase tracking-[0.2em] text-red-400 border border-red-900/50 rounded-lg px-3 py-1.5 hover:bg-red-950/40 hover:border-red-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? "resetting…" : "reset history"}
      </button>
      {error && (
        <span className="text-[10px] text-red-400 font-mono">{error}</span>
      )}
    </div>
  );
}
