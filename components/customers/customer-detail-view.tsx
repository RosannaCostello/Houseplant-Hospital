import Link from "next/link";
import { formatPlantAge } from "@/lib/format-plant-age";
import { plantStatusLabel } from "@/lib/plant-status";
import type {
  CustomerDetail,
  CustomerDetailPlant,
  CustomerDetailVisit,
} from "@/lib/customers/get-customer-detail";

type CustomerDetailViewProps = {
  customer: CustomerDetail;
};

function plantTitle(plant: CustomerDetailPlant): string {
  if (plant.name?.trim()) return plant.name.trim();
  if (plant.species?.trim()) return plant.species.trim();
  return "Unnamed plant";
}

function PlantHistoryRow({ plant }: { plant: CustomerDetailPlant }) {
  return (
    <Link
      href={`/app/plants/${plant.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 transition-colors hover:border-zinc-200 hover:bg-white"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-900">{plantTitle(plant)}</p>
        <p className="text-xs text-zinc-500">{plantStatusLabel(plant.status)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {plant.bugsFound ? (
          <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Bugs
          </span>
        ) : null}
        <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700 ring-1 ring-zinc-200">
          {plant.size}
        </span>
      </div>
    </Link>
  );
}

function VisitHistoryCard({ visit }: { visit: CustomerDetailVisit }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">
            {new Date(visit.checkinDate).toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{formatPlantAge(visit.checkinDate)}</p>
        </div>
        <Link
          href={`/app/visits/${visit.id}`}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          View visit
        </Link>
      </div>

      {visit.notes ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600">{visit.notes}</p>
      ) : null}

      {visit.plants.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {visit.plants.map((plant) => (
            <li key={plant.id}>
              <PlantHistoryRow plant={plant} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">No plants on this visit.</p>
      )}
    </article>
  );
}

export function CustomerDetailView({ customer }: CustomerDetailViewProps) {
  const visitCount = customer.visits.length;
  const plantCount = customer.visits.reduce((total, visit) => total + visit.plants.length, 0);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <Link href="/app/customers" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          ← Back to search
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {customer.firstName} {customer.lastName}
        </h1>
        <p className="mt-1 text-base text-zinc-600">Customer history</p>
      </div>

      <dl className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Email</dt>
          <dd className="mt-1 text-sm text-zinc-900">
            <a className="hover:underline" href={`mailto:${customer.email}`}>
              {customer.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Phone</dt>
          <dd className="mt-1 text-sm text-zinc-900">
            {customer.phone ? (
              <a className="hover:underline" href={`tel:${customer.phone}`}>
                {customer.phone}
              </a>
            ) : (
              <span className="text-zinc-500">Not provided</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Visits</dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">{visitCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Plants</dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">{plantCount}</dd>
        </div>
      </dl>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Visit history</h2>
        {customer.visits.length > 0 ? (
          <div className="space-y-4">
            {customer.visits.map((visit) => (
              <VisitHistoryCard key={visit.id} visit={visit} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
            No visits recorded for this customer yet.
          </p>
        )}
      </section>
    </div>
  );
}
