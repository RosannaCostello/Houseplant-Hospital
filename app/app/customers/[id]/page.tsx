import { notFound } from "next/navigation";
import { SetPageTitle } from "@/components/app/app-page-title";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";
import { formatCustomerDisplayName } from "@/lib/customers/format-customer-display-name";
import { getCustomerDetail } from "@/lib/customers/get-customer-detail";
import { isValidRouteId } from "@/lib/validation/parse-route-id";

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;

  if (!isValidRouteId(id)) {
    notFound();
  }

  const customer = await getCustomerDetail(id);

  if (!customer) {
    notFound();
  }

  return (
    <>
      <SetPageTitle title={formatCustomerDisplayName(customer)} />
      <CustomerDetailView customer={customer} />
    </>
  );
}
