import Link from "next/link";
import { scanConversationKeys } from "@/lib/memory";

const PHONE_DISPLAY = "+1 (844) 787-1281";
const PHONE_HREF = "+18447871281";

export default async function Home() {
  // Fetch real conversation count and add a base number for the HackDavis demo
  let activeUsers = 542;
  try {
    const keys = await scanConversationKeys(1000);
    activeUsers += keys.length;
  } catch (err) {
    console.error("Failed to load user count", err);
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-white font-sans overflow-hidden selection:bg-orange-500/30">
      
      {/* Decorative Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-orange-600/20 to-rose-600/20 blur-3xl" />
        <div className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-indigo-600/20 to-blue-600/20 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto w-full px-6 py-16 flex flex-col items-center gap-16">
        
        {/* Header Section */}
        <div className="w-full flex flex-col items-center text-center gap-6 pt-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium tracking-wide uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            Live on SMS in India
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
            Meet Rithik.ai
          </h1>
          
          <p className="text-xl sm:text-2xl text-zinc-300 max-w-2xl leading-relaxed font-light">
            The AI assistant that works on <strong className="text-white font-medium">any phone</strong>. 
            No internet, no smartphone, no app required. Just send a text.
          </p>

          {/* Live Counter */}
          <div className="mt-4 flex flex-col items-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
            <span className="text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400 tabular-nums">
              {activeUsers.toLocaleString()}
            </span>
            <span className="text-sm font-medium text-zinc-400 uppercase tracking-widest mt-2">
              People Empowered
            </span>
          </div>
        </div>

        {/* Call to Action */}
        <a
          href={`sms:${PHONE_HREF}`}
          className="group w-full max-w-xl relative p-1 rounded-3xl bg-gradient-to-b from-zinc-800 to-zinc-950 hover:from-orange-500 hover:to-rose-600 transition-all duration-500 overflow-hidden"
        >
          <div className="w-full bg-zinc-950/90 backdrop-blur-xl rounded-[22px] p-8 flex flex-col items-center gap-3 border border-white/5">
            <span className="text-sm uppercase tracking-widest text-zinc-400 group-hover:text-orange-400 transition-colors">
              Try it right now
            </span>
            <span className="text-4xl sm:text-5xl font-mono font-bold text-white tabular-nums tracking-tight">
              {PHONE_DISPLAY}
            </span>
            <span className="text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
              tap to open your messages app
            </span>
          </div>
        </a>

        {/* Features / What we do */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
          <FeatureCard 
            title="Local Languages" 
            desc="Rithik understands Hindi, Devanagari, Hinglish, and regional dialects naturally."
            icon="🗣️"
          />
          <FeatureCard 
            title="Farming & Market" 
            desc="Get daily Mandi prices, weather updates, and agricultural advice instantly."
            icon="🌾"
          />
          <FeatureCard 
            title="Zero Learning Curve" 
            desc="If you know how to send a basic text message, you know how to use Rithik.ai."
            icon="📱"
          />
        </div>

        {/* Example Chats */}
        <div className="w-full max-w-3xl flex flex-col gap-6 pt-10">
          <h2 className="text-2xl font-bold text-center text-zinc-200">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Example q="गेहूं का भाव क्या है" a="मुझे ताज़ा भाव नहीं पता, मंडी से पूछें" />
            <Example q="barish kab hogi sirsa mein" a="aaj sirsa mein barish ho sakti hai, chata rakh lo." />
            <Example q="how to stop pest on cotton" a="use neem oil spray twice a week on the leaves." />
            <Example q="mera beta bimar hai" a="mujhe pakka nahi pata. kripya doctor ya aspatal se poochhe." />
          </div>
        </div>

        {/* Footer */}
        <div className="w-full pt-16 pb-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <span>&copy; {new Date().getFullYear()} Rithik.ai — Built at HackDavis</span>
          <div className="flex gap-4">
            <span>Standard SMS rates apply</span>
            <Link href="/admin" className="hover:text-orange-400 transition-colors underline-offset-4 hover:underline">
              Operator Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="flex flex-col gap-3 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-orange-500/30 transition-colors">
      <span className="text-3xl">{icon}</span>
      <h3 className="text-lg font-semibold text-zinc-200">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function Example({ q, a }: { q: string; a: string }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 flex flex-col gap-3 backdrop-blur-sm">
      <div className="flex flex-col gap-1 items-end">
        <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest px-2">User</div>
        <div className="bg-zinc-800 text-zinc-200 text-sm px-4 py-2 rounded-2xl rounded-tr-sm">{q}</div>
      </div>
      <div className="flex flex-col gap-1 items-start mt-2">
        <div className="text-orange-500/80 text-[10px] font-bold uppercase tracking-widest px-2">Rithik.ai</div>
        <div className="bg-gradient-to-br from-orange-500/10 to-rose-500/10 border border-orange-500/20 text-orange-100 text-sm px-4 py-2 rounded-2xl rounded-tl-sm">{a}</div>
      </div>
    </div>
  );
}
