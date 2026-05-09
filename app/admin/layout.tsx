// Outer admin layout — purely a passthrough.
// Auth + chrome live in app/admin/(authed)/layout.tsx so that
// /admin/login can render unauthenticated without a redirect loop.

export default function AdminOuterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
