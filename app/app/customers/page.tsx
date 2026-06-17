import { CustomerSearchView } from "@/components/customers/customer-search-view";
import { searchCustomers } from "@/lib/customers/search-customers";

type CustomersPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? await searchCustomers(query) : [];

  return <CustomerSearchView initialQuery={query} results={results} />;
}
