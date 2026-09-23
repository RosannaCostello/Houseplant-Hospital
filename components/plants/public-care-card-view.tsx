import Image from "next/image";
import type { CareCardPlant, PublicCareCard } from "@/lib/plants/get-public-care-card";
import { formatPlantMilestoneDate } from "@/lib/plants/get-plant-milestone-dates";
import { cn } from "@/lib/utils";

type PublicCareCardViewProps = {
  card: PublicCareCard;
  /** When set (legacy plant case redirect), scroll/highlight this plant. */
  highlightPlantId?: string;
};

function plantTitle(plant: CareCardPlant): string {
  const species = plant.species?.trim();
  return species || "Your plant";
}

function formatCheckedIn(at: string): string {
  return new Date(at).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type TimelineStep = {
  key: string;
  label: string;
  at: string | null;
  done: boolean;
  current: boolean;
};

function buildTimeline(plant: CareCardPlant, checkedInAt: string): TimelineStep[] {
  const { milestones, status } = plant;
  const underCareAt = milestones.quarantinedAt ?? milestones.surgeryAt;
  const underCareDone =
    Boolean(underCareAt) ||
    status === "quarantine" ||
    status === "in_surgery" ||
    status === "propagation" ||
    status === "outpatient" ||
    status === "collected" ||
    status === "dead";
  const readyAt = milestones.outpatientAt;
  const readyDone =
    Boolean(readyAt) || status === "outpatient" || status === "collected" || status === "dead";
  const collectedAt = milestones.collectedAt;
  const isCollected = status === "collected";

  const steps: TimelineStep[] = [
    {
      key: "check_in",
      label: "Checked in",
      at: checkedInAt,
      done: true,
      current: status === "check_in",
    },
    {
      key: "care",
      label: "In care",
      at: underCareAt,
      done: underCareDone,
      current:
        status === "quarantine" || status === "in_surgery" || status === "propagation",
    },
    {
      key: "ready",
      label: status === "dead" ? "Assessment complete" : "Ready for collection",
      at: readyAt,
      done: readyDone,
      current: status === "outpatient" || status === "dead",
    },
  ];

  if (isCollected || collectedAt) {
    steps.push({
      key: "collected",
      label: "Collected",
      at: collectedAt,
      done: true,
      current: isCollected,
    });
  }

  return steps;
}

function PlantTimeline({ plant, checkedInAt }: { plant: CareCardPlant; checkedInAt: string }) {
  const steps = buildTimeline(plant, checkedInAt);

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => (
        <li key={step.key} className="flex gap-3">
          <div className="flex w-4 flex-col items-center">
            <span
              className={cn(
                "mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-hilda-surface",
                step.current
                  ? "bg-hilda-gold ring-hilda-gold"
                  : step.done
                    ? "bg-hilda-heading ring-hilda-heading/20"
                    : "bg-hilda-border ring-transparent",
              )}
            />
            {index < steps.length - 1 ? (
              <span
                className={cn(
                  "mt-1 w-px flex-1 min-h-4",
                  step.done ? "bg-hilda-heading/20" : "bg-hilda-border/40",
                )}
              />
            ) : null}
          </div>
          <div className={cn("pb-4", index === steps.length - 1 && "pb-0")}>
            <p
              className={cn(
                "text-sm font-medium",
                step.current ? "text-hilda-heading" : "text-hilda-text",
              )}
            >
              {step.label}
            </p>
            {step.at ? (
              <p className="mt-0.5 text-xs text-hilda-text-muted">
                {formatPlantMilestoneDate(step.at)}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function CareCardPlantSection({
  plant,
  checkedInAt,
  index,
  total,
  highlight,
}: {
  plant: CareCardPlant;
  checkedInAt: string;
  index: number;
  total: number;
  highlight: boolean;
}) {
  const ready = plant.status === "outpatient";

  return (
    <article
      id={`plant-${plant.id}`}
      className={cn(
        "overflow-hidden rounded-hilda border bg-hilda-surface shadow-sm",
        highlight ? "border-hilda-gold ring-1 ring-hilda-gold/40" : "border-hilda-border/15",
        ready ? "border-l-4 border-l-hilda-gold" : null,
      )}
    >
      <div className="relative aspect-[4/3] w-full bg-hilda-bg">
        {plant.photoUrl ? (
          <Image
            src={plant.photoUrl}
            alt=""
            fill
            sizes="(max-width: 672px) 100vw, 40rem"
            className="object-cover"
            unoptimized
            priority={index === 0}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-hilda-text-muted">
            No photo
          </div>
        )}
        {total > 1 ? (
          <span className="absolute left-3 top-3 rounded-hilda-sm bg-hilda-surface/95 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-hilda-heading shadow-sm">
            Plant {index + 1} of {total}
          </span>
        ) : null}
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-2xl font-normal text-hilda-heading">
              {plantTitle(plant)}
            </h2>
            <p className="text-sm text-hilda-text-muted">{plant.sizeLabel}</p>
          </div>
          {plant.pestTypeLabel ? (
            <p className="mt-2 text-sm text-hilda-text">
              Pests treated:{" "}
              <span className="font-medium text-hilda-heading">{plant.pestTypeLabel}</span>
            </p>
          ) : null}
        </div>

        <section>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-hilda-text-muted">
            Status
          </p>
          <p className="mt-1 text-lg font-semibold text-hilda-heading">{plant.statusLabel}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-hilda-text">{plant.statusMessage}</p>
        </section>

        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-hilda-text-muted">
            Journey
          </p>
          <PlantTimeline plant={plant} checkedInAt={checkedInAt} />
        </section>

        {plant.showAftercare && (plant.treatmentNote || plant.careTips.length > 0) ? (
          <section className="space-y-4 border-t border-hilda-border/10 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-hilda-text-muted">
              Aftercare
            </p>
            {plant.treatmentNote ? (
              <div>
                <h3 className="text-sm font-medium text-hilda-heading">What we did</h3>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-hilda-text">
                  {plant.treatmentNote}
                </p>
              </div>
            ) : null}
            {plant.careTips.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium text-hilda-heading">Care tips for home</h3>
                <ul className="mt-2 space-y-2">
                  {plant.careTips.map((tip) => (
                    <li key={`${tip.category}-${tip.label}`} className="text-sm text-hilda-text">
                      <span className="font-medium text-hilda-heading">{tip.label}: </span>
                      {tip.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </article>
  );
}

export function PublicCareCardView({ card, highlightPlantId }: PublicCareCardViewProps) {
  const plantCount = card.plants.length;
  const anyReady = card.plants.some((plant) => plant.status === "outpatient");
  const allCollected = card.plants.every((plant) => plant.status === "collected");

  return (
    <div className="space-y-8">
      <header className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hilda-gold">
          Customer Care Card
        </p>
        <h1 className="font-serif text-3xl font-normal tracking-tight text-hilda-heading sm:text-4xl">
          Your plants at Hilda
        </h1>
        <p className="text-sm text-hilda-text">
          {plantCount === 1 ? "1 plant" : `${plantCount} plants`} · Checked in{" "}
          {formatCheckedIn(card.checkedInAt)}
        </p>
        {anyReady && !allCollected ? (
          <p className="mx-auto max-w-md rounded-hilda border border-hilda-gold/40 bg-hilda-gold/10 px-4 py-3 text-sm font-medium text-hilda-heading">
            One or more plants are ready for collection at Hilda.
          </p>
        ) : null}
      </header>

      <div className="space-y-6">
        {card.plants.map((plant, index) => (
          <CareCardPlantSection
            key={plant.id}
            plant={plant}
            checkedInAt={card.checkedInAt}
            index={index}
            total={plantCount}
            highlight={highlightPlantId === plant.id}
          />
        ))}
      </div>

      <p className="text-center text-xs text-hilda-text-muted">
        Questions? Speak to the team at Hilda Houseplant Hospital.
      </p>
    </div>
  );
}
