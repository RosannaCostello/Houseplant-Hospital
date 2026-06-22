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
      className="flex items-center justify-between gap-3 rounded-none border border-hilda-border/15 bg-hilda-bg px-3 py-2 transition-colors hover:border-hilda-border/20 hover:bg-hilda-surface"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-hilda-heading">{plantTitle(plant)}</p>
        <p className="text-xs text-hilda-text-muted">{plantStatusLabel(plant.status)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {plant.bugsFound ? (
          <span className="rounded bg-hilda-bugs px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-hilda-inverse">
            Bugs
          </span>
        ) : null}
        <span className="rounded bg-hilda-surface px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-hilda-text ring-1 ring-hilda-border/15">
          {plant.size}
        </span>
      </div>
    </Link>
  );
}

function VisitHistoryCard({ visit }: { visit: CustomerDetailVisit }) {
  return (
    <article className="rounded-none border border-hilda-border/15 bg-hilda-bg p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-hilda-heading">
            {new Date(visit.checkinDate).toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <p className="mt-0.5 text-xs text-hilda-text-muted">{formatPlantAge(visit.checkinDate)}</p>
        </div>
        <Link
          href={`/app/visits/${visit.id}`}
          className="rounded-none border border-hilda-border/25 bg-hilda-surface px-3 py-1.5 text-sm font-medium text-hilda-heading hover:bg-hilda-bg"
        >
          View visit
        </Link>
      </div>

      {visit.notes ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-hilda-text">{visit.notes}</p>
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
        <p className="mt-4 text-sm text-hilda-text-muted">No plants on this visit.</p>
      )}
    </article>
  );
}

export function CustomerDetailView({ customer }: CustomerDetailViewProps) {
  const visitCount = customer.visits.length;
  const plantCount = customer.visits.reduce((total, visit) => total + visit.plants.length, 0);

  return (
    <div className="mx-auto w-full max-w-3xl pb-bottom-nav">
      <section className="space-y-6 rounded-none border border-hilda-border/15 bg-hilda-surface p-5 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-hilda-text-muted">Email</dt>
            <dd className="mt-1 text-sm text-hilda-heading">
              <a className="hover:underline" href={`mailto:${customer.email}`}>
                {customer.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-hilda-text-muted">Phone</dt>
            <dd className="mt-1 text-sm text-hilda-heading">
              {customer.phone ? (
                <a className="hover:underline" href={`tel:${customer.phone}`}>
                  {customer.phone}
                </a>
              ) : (
                <span className="text-hilda-text-muted">Not provided</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-hilda-text-muted">Visits</dt>
            <dd className="mt-1 text-sm font-medium text-hilda-heading">{visitCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-hilda-text-muted">Plants</dt>
            <dd className="mt-1 text-sm font-medium text-hilda-heading">{plantCount}</dd>
          </div>
        </dl>

        <section className="space-y-3 border-t border-hilda-border/10 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-hilda-text-muted">Visit history</h2>
          {customer.visits.length > 0 ? (
            <div className="space-y-3">
              {customer.visits.map((visit) => (
                <VisitHistoryCard key={visit.id} visit={visit} />
              ))}
            </div>
          ) : (
            <p className="rounded-none border border-dashed border-hilda-border/15 bg-hilda-bg px-4 py-8 text-center text-sm text-hilda-text-muted">
              No visits recorded for this customer yet.
            </p>
          )}
        </section>
      </section>
    </div>
  );
}
