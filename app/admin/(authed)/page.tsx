import type {
  StatsResponse,
  ConversationsListResponse,
} from "@/lib/types";
import { adminFetch } from "@/lib/admin-fetch";
import { redirect } from "next/navigation";
import StatsCards from "@/components/StatsCards";
import HourlyChart from "@/components/HourlyChart";
import SpendChart from "@/components/SpendChart";
import LanguageChart from "@/components/LanguageChart";
import ConversationList from "@/components/ConversationList";

export default async function AdminHome() {
  const [statsRes, convRes] = await Promise.all([
    adminFetch("/api/admin/stats"),
    adminFetch("/api/admin/conversations"),
  ]);

  if (statsRes.status === 401 || convRes.status === 401) {
    redirect("/admin/login");
  }

  if (!statsRes.ok || !convRes.ok) {
    return (
      <div className="text-zinc-400">
        <h1 className="text-2xl font-semibold text-white mb-4">Dashboard</h1>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
          <div className="text-sm text-red-400">
            Failed to load dashboard data ({statsRes.status} / {convRes.status}).
          </div>
        </div>
      </div>
    );
  }

  const stats: StatsResponse = await statsRes.json();
  const convs: ConversationsListResponse = await convRes.json();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Dashboard
        </h1>
        <span className="text-xs uppercase tracking-[0.25em] text-zinc-500">
          live
        </span>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Section title="Inbound — last 24h">
            <HourlyChart data={stats.hourlyMessages} />
          </Section>
          <Section title="Spend — last 7d">
            <SpendChart data={stats.dailySpend} />
          </Section>
        </div>
        <div>
          <Section title="Languages — today">
            <LanguageChart data={stats.langDistribution} />
          </Section>
        </div>
      </div>

      <Section title="Conversations">
        <ConversationList conversations={convs.conversations} />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl">
      <div className="px-5 py-3 border-b border-zinc-900">
        <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-400">
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
