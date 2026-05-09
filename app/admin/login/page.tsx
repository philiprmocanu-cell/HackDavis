"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/admin");
        router.refresh();
        return;
      }
      if (res.status === 401) {
        setError("incorrect password");
      } else {
        setError(`login failed (${res.status})`);
      }
    } catch {
      setError("network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-6 py-16 font-sans">
      <div className="w-full max-w-sm flex flex-col items-stretch gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-xs uppercase tracking-[0.25em] text-zinc-500">
            Operator login
          </span>
          <h1 className="text-3xl font-bold tracking-tight">Rithik.ai</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4"
        >
          <label className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono tabular-nums outline-none focus:border-zinc-600 transition"
              required
            />
          </label>

          {error && (
            <div className="text-xs text-red-400 font-mono">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting || password.length === 0}
            className="bg-white text-black font-medium rounded-lg px-3 py-2 hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "signing in…" : "sign in"}
          </button>
        </form>

        <Link
          href="/"
          className="text-xs text-zinc-600 hover:text-zinc-400 text-center"
        >
          ← back to home
        </Link>
      </div>
    </main>
  );
}
