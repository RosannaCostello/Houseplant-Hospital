import Link from "next/link";
import { fetchCheckInDraft } from "@/app/actions/check-in-draft";
import { fetchDraftCheckoutState } from "@/app/actions/pos-checkout";
import { PlantsStepForm } from "@/components/check-in/plants-step-form";
import { Button } from "@/components/ui/button";
import { createEmptyPlant } from "@/lib/check-in/plant-schema";

type CheckInPlantsPageProps = {
  searchParams: Promise<{ draft?: string }>;
};

export default async function CheckInPlantsPage({ searchParams }: CheckInPlantsPageProps) {
  const { draft: draftId } = await searchParams;

  if (!draftId) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-hilda-heading">Check-in</h1>
        <p className="text-hilda-text">Start with customer details before adding plants.</p>
        <Button asChild size="lg">
          <Link href="/app/check-in">Go to customer step</Link>
        </Button>
      </div>
    );
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

  const checkoutState = await fetchDraftCheckoutState(draftId);
  const checkout = checkoutState ?? {
    status: "not_started" as const,
    queuedAt: null,
    paidAt: null,
    shopifyOrderId: null,
    summaryLines: [],
    posCheckoutRequired: false,
    canProceedToPhotos: true,
  };

  return (
    <PlantsStepForm
      draftId={draftId}
      customer={draft.customer}
      posCheckoutRequired={checkout.posCheckoutRequired}
      initialCheckout={{
        status: checkout.status,
        queuedAt: checkout.queuedAt,
        paidAt: checkout.paidAt,
        shopifyOrderId: checkout.shopifyOrderId,
        summaryLines: checkout.summaryLines,
      }}
      initialPlants={
        draft.plants.length
          ? draft.plants.map((plant) => ({ ...plant, bugsFound: plant.bugsFound ?? null }))
          : [createEmptyPlant()]
      }
    />
  );
}
