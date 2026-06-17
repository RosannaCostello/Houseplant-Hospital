import { notFound } from "next/navigation";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";
import { getCustomerDetail } from "@/lib/customers/get-customer-detail";

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  const customer = await getCustomerDetail(id);

  if (!customer) {
    notFound();
  }

  return <CustomerDetailView customer={customer} />;
}
