import Link from "next/link";
import { CustomerStepForm } from "@/components/check-in/customer-step-form";
import { fetchCheckInDraft } from "@/app/actions/check-in-draft";
import { Button } from "@/components/ui/button";

type CheckInCustomerPageProps = {
  searchParams: Promise<{ draft?: string }>;
};

export default async function CheckInCustomerPage({ searchParams }: CheckInCustomerPageProps) {
  const { draft: draftId } = await searchParams;

  if (!draftId) {
    return <CustomerStepForm />;
  }

  const draft = await fetchCheckInDraft(draftId);

  if (!draft) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-hilda-heading">Check-in</h1>
        <p className="text-hilda-text">This draft check-in could not be found. It may have been completed or discarded.</p>
        <Button asChild size="lg">
          <Link href="/app/check-in">Start new check-in</Link>
        </Button>
      </div>
    );
  }

  return <CustomerStepForm draftId={draftId} initialCustomer={draft.customer} />;
}
