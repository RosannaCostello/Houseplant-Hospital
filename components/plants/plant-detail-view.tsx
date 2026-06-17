import Image from "next/image";
import Link from "next/link";
import { PlantCaseLink } from "@/components/plants/plant-case-link";
import { TreatmentNotesSection } from "@/components/plants/treatment-notes-section";
import { formatPlantAge } from "@/lib/format-plant-age";
import type { PlantDetail } from "@/lib/plants/get-plant-detail";
import { plantStatusLabel } from "@/lib/plant-status";

type PlantDetailViewProps = {
  plant: PlantDetail;
};

function plantTitle(plant: PlantDetail): string {
  if (plant.name?.trim()) return plant.name.trim();
  if (plant.species?.trim()) return plant.species.trim();
  return "Unnamed plant";
}

export function PlantDetailView({ plant }: PlantDetailViewProps) {
  const latestPhoto = plant.photos[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <Link href="/app" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          ← Back to dashboard
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {plantTitle(plant)}
        </h1>
        {plant.name?.trim() && plant.species?.trim() ? (
          <p className="mt-1 text-base text-zinc-600">{plant.species}</p>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="relative aspect-[4/3] w-full bg-zinc-100">
          {latestPhoto ? (
            <Image
              src={latestPhoto.url}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 48rem"
              className="object-cover"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">No photo</div>
          )}
          {plant.bugsFound ? (
            <span className="absolute right-4 top-4 rounded-md bg-orange-500 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              Bugs
            </span>
          ) : null}
        </div>

        {plant.photos.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto border-t border-zinc-100 p-3">
            {plant.photos.map((photo) => (
              <div
                key={photo.id}
                className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-200"
              >
                <Image
                  src={photo.thumbnailUrl ?? photo.url}
                  alt=""
                  fill
                  sizes="5rem"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <dl className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">{plantStatusLabel(plant.status)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Size</dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">{plant.size}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Check-in</dt>
          <dd className="mt-1 text-sm text-zinc-900">
            {new Date(plant.checkedInAt).toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            <span className="text-zinc-500">({formatPlantAge(plant.checkedInAt)})</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Customer</dt>
          <dd className="mt-1 text-sm text-zinc-900">
            {plant.customer.firstName} {plant.customer.lastName}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Contact</dt>
          <dd className="mt-1 text-sm text-zinc-900">
            <a className="hover:underline" href={`mailto:${plant.customer.email}`}>
              {plant.customer.email}
            </a>
            {plant.customer.phone ? (
              <span className="text-zinc-600">
                {" "}
                ·{" "}
                <a className="hover:underline" href={`tel:${plant.customer.phone}`}>
                  {plant.customer.phone}
                </a>
              </span>
            ) : null}
          </dd>
        </div>
        {plant.visitNotes ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">{plant.visitNotes}</dd>
          </div>
        ) : null}
      </dl>

      <TreatmentNotesSection plantId={plant.id} notes={plant.treatmentNotes} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href={`/app/visits/${plant.visitId}`}
          className="inline-flex rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          View visit (all plants on this drop-off)
        </Link>
        <PlantCaseLink
          plantId={plant.id}
          className="inline-flex rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        />
      </div>
    </div>
  );
}
