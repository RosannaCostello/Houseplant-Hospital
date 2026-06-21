import { BugsFoundBadge } from "@/components/plants/bugs-found-badge";
import Image from "next/image";
import Link from "next/link";
import { formatPlantAge } from "@/lib/format-plant-age";
import { plantStatusLabel } from "@/lib/plant-status";
import type { VisitDetail, VisitDetailPlant } from "@/lib/visits/get-visit-detail";

type VisitDetailViewProps = {
  visit: VisitDetail;
};

function plantTitle(plant: VisitDetailPlant): string {
  if (plant.name?.trim()) return plant.name.trim();
  if (plant.species?.trim()) return plant.species.trim();
  return "Unnamed plant";
}

function plantSubtitle(plant: VisitDetailPlant): string | null {
  if (plant.name?.trim() && plant.species?.trim()) return plant.species.trim();
  return null;
}

function VisitPlantRow({ plant }: { plant: VisitDetailPlant }) {
  const subtitle = plantSubtitle(plant);

  return (
    <Link
      href={`/app/plants/${plant.id}`}
      className="flex gap-4 rounded-none border border-zinc-200 bg-white p-3 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50"
    >
      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-none border border-zinc-100 bg-zinc-100">
        {plant.thumbnailUrl ? (
          <Image
            src={plant.thumbnailUrl}
            alt=""
            fill
            sizes="6rem"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            No photo
          </div>
        )}
        {plant.bugsFound ? (
          <BugsFoundBadge className="right-1 top-1 bg-orange-500" iconClassName="h-3 w-3" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-semibold text-zinc-900">{plantTitle(plant)}</p>
        {subtitle ? <p className="truncate text-xs text-zinc-500">{subtitle}</p> : null}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700">
            {plant.size}
          </span>
          <span className="text-xs text-zinc-600">{plantStatusLabel(plant.status)}</span>
        </div>
      </div>
    </Link>
  );
}

export function VisitDetailView({ visit }: VisitDetailViewProps) {
  const plantCount = visit.plants.length;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <Link href="/app" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          ← Back to dashboard
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {visit.customer.firstName} {visit.customer.lastName}
        </h1>
        <p className="mt-1 text-base text-zinc-600">
          Drop-off ·{" "}
          {new Date(visit.checkinDate).toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
          })}{" "}
          <span className="text-zinc-500">({formatPlantAge(visit.checkinDate)})</span>
        </p>
      </div>

      <dl className="grid gap-4 rounded-none border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Customer</dt>
          <dd className="mt-1 text-sm text-zinc-900">
            {visit.customer.firstName} {visit.customer.lastName}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Plants</dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">
            {plantCount} {plantCount === 1 ? "plant" : "plants"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Contact</dt>
          <dd className="mt-1 text-sm text-zinc-900">
            <a className="hover:underline" href={`mailto:${visit.customer.email}`}>
              {visit.customer.email}
            </a>
            {visit.customer.phone ? (
              <span className="text-zinc-600">
                {" "}
                ·{" "}
                <a className="hover:underline" href={`tel:${visit.customer.phone}`}>
                  {visit.customer.phone}
                </a>
              </span>
            ) : null}
          </dd>
        </div>
        {visit.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">{visit.notes}</dd>
          </div>
        ) : null}
      </dl>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Plants on this visit
        </h2>
        {visit.plants.length > 0 ? (
          <ul className="space-y-3">
            {visit.plants.map((plant) => (
              <li key={plant.id}>
                <VisitPlantRow plant={plant} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-none border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
            No plants linked to this visit.
          </p>
        )}
      </section>
    </div>
  );
}
