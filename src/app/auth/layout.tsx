// Auth pages construct Supabase browser clients during SSR prerender —
// render on-demand so `next build` never needs Supabase env vars.
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
