import { ServicesPage } from "@/features/public/services";

type SearchParams = Promise<{
  category?: string;
  q?: string;
  offer?: string;
  code?: string;
  package?: string;
  page?: string;
}>;

export default async function ServicesRoutePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;

  return <ServicesPage searchParams={resolvedSearchParams} />;
}
