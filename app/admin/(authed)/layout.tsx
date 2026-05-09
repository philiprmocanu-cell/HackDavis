import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifyAdminCookie } from "@/lib/admin-auth";
import ClientLogout from "@/components/ClientLogout";

// Auth gate for the operator dashboard. Anything inside the (authed) route
// group goes through this layout. The login page lives outside this group at
// /admin/login so it never triggers the auth check.

export default async function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const value = cookieStore.get("admin_session")?.value;
  if (!verifyAdminCookie(value)) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      <header className="border-b border-zinc-900 bg-black">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-baseline gap-2 hover:opacity-80 transition"
          >
            <span className="text-lg font-bold tracking-tight">Rithik.ai</span>
            <span className="text-xs uppercase tracking-[0.25em] text-zinc-500">
              · admin
            </span>
          </Link>
          <ClientLogout />
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
