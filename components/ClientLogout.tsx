"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ClientLogout() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    if (busy) return;
    setBusy(true);
    try {
      // Best-effort: ask the backend to clear the cookie if the route exists.
      const res = await fetch("/api/admin/logout", { method: "POST" }).catch(
        () => null,
      );
      // Fallback: stomp the cookie client-side too. This will work for
      // non-HttpOnly cookies; for HttpOnly cookies we rely on the backend route.
      document.cookie =
        "admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      // If the route 404'd, we still navigate — the layout will redirect to
      // /admin/login when the cookie verify fails.
      void res;
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className="text-xs uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition disabled:opacity-50"
    >
      {busy ? "logging out…" : "logout"}
    </button>
  );
}
