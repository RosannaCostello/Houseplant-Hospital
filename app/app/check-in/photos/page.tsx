import Link from "next/link";
import { fetchCheckInDraft } from "@/app/actions/check-in-draft";
import { fetchDraftCheckoutState } from "@/app/actions/pos-checkout";
import { PhotosStepForm } from "@/components/check-in/photos-step-form";
import { Button } from "@/components/ui/button";
import { canProceedToPhotosStep } from "@/lib/shopify/pos-checkout-types";

type CheckInPhotosPageProps = {
  searchParams: Promise<{ draft?: string }>;
};

export default async function CheckInPhotosPage({ searchParams }: CheckInPhotosPageProps) {
  const { draft: draftId } = await searchParams;

  if (!draftId) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-hilda-heading">Check-in</h1>
        <p className="text-hilda-text">Start with customer details before adding photos.</p>
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

  if (draft.plants.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-hilda-heading">Check-in</h1>
        <p className="text-hilda-text">Add at least one plant before continuing to photos.</p>
        <Button asChild size="lg">
          <Link href={`/app/check-in/plants?draft=${draftId}`}>Go to plants step</Link>
        </Button>
      </div>
    );
  }

  const checkoutState = await fetchDraftCheckoutState(draftId);
  const posCheckoutRequired = checkoutState?.posCheckoutRequired ?? false;

  if (
    posCheckoutRequired &&
    !canProceedToPhotosStep(checkoutState?.status, true)
  ) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-hilda-heading">Check-in</h1>
        <p className="text-hilda-text">
          Complete payment in Shopify POS or choose Pay at collection on the plants step before adding photos.
        </p>
        <Button asChild size="lg">
          <Link href={`/app/check-in/plants?draft=${draftId}`}>Back to plants step</Link>
        </Button>
      </div>
    );
  }

  return (
    <PhotosStepForm
      draftId={draftId}
      customer={draft.customer}
      plants={draft.plants}
      initialPhotos={draft.photos.map((photo) => ({
        plantClientId: photo.plantClientId,
        mimeType: photo.mimeType,
        previewUrl: photo.previewUrl,
        byteSize: photo.byteSize,
        width: photo.width,
        height: photo.height,
      }))}
    />
  );
}
