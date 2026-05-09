import Link from "next/link";

const PHONE_DISPLAY = "+1 (555) 555-0100";
const PHONE_HREF = "+15555550100";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-6 py-16 font-sans">
      <div className="w-full max-w-xl flex flex-col items-center text-center gap-12">
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs uppercase tracking-[0.25em] text-zinc-500">
            SMS AI for everyone
          </span>
          <h1 className="text-6xl sm:text-7xl font-bold tracking-tight">
            Rithik.ai
          </h1>
          <p className="text-lg text-zinc-300 max-w-sm leading-relaxed">
            Text our number. Get answers in your language. Works on any phone —
            even a Nokia.
          </p>
        </div>

        <a
          href={`sms:${PHONE_HREF}`}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center gap-2 hover:border-zinc-700 transition"
        >
          <span className="text-xs uppercase tracking-wider text-zinc-500">
            Text us
          </span>
          <span className="text-3xl font-mono font-semibold text-white tabular-nums">
            {PHONE_DISPLAY}
          </span>
          <span className="text-xs text-zinc-600">
            tap to open your messages app
          </span>
        </a>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <Example q="what is rain" a="water from clouds" />
          <Example q="5 + 3" a="8" />
          <Example q="aaj mausam kaisa" a="aaj barish ho sakti hai" />
          <Example q="गेहूं का भाव क्या है" a="मुझे ताज़ा भाव नहीं पता, मंडी से पूछें" />
        </div>

        <div className="text-xs text-zinc-500 pt-6 border-t border-zinc-900 w-full flex flex-col gap-1">
          <span>SMS rates may apply from your carrier.</span>
          <Link href="/admin" className="text-zinc-600 hover:text-zinc-400 underline-offset-4 hover:underline">
            operator login
          </Link>
        </div>
      </div>
    </main>
  );
}

function Example({ q, a }: { q: string; a: string }) {
  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 flex flex-col gap-1">
      <div className="text-zinc-500 text-[10px] uppercase tracking-wider">you</div>
      <div className="text-zinc-100 text-sm">{q}</div>
      <div className="text-zinc-500 text-[10px] uppercase tracking-wider mt-1">
        rithik
      </div>
      <div className="text-zinc-100 text-sm">{a}</div>
    </div>
  );
}
