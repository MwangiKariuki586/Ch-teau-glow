import { LandingPage } from "@/features/public/landing";

// Fetches live Supabase data at request time — skip static prerender
// so `next build` doesn't require Supabase env vars.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Château Glow - Premium Beauty & Aesthetics",
  description:
    "Experience premium beauty treatments across our multiple locations. From medical aesthetics to semi-permanent makeup, we deliver precision and care.",
};

export default function Home() {
  return <LandingPage />;
}
