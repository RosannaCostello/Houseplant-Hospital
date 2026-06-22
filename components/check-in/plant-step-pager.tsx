import { cn } from "@/lib/utils";

type PlantStepPagerProps = {
  total: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isComplete?: (index: number) => boolean;
};

export function PlantStepPager({
  total,
  currentIndex,
  onIndexChange,
  isComplete,
}: PlantStepPagerProps) {
  if (total <= 1) return null;

  return (
    <div className="flex shrink-0 items-center gap-2 overflow-x-auto pb-1">
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-hilda-text-muted">
        Plant {currentIndex + 1} of {total}
      </span>
      <div className="flex min-w-0 gap-1.5">
        {Array.from({ length: total }, (_, index) => {
          const active = index === currentIndex;
          const complete = isComplete?.(index) ?? false;

          return (
            <button
              key={index}
              type="button"
              aria-label={`Plant ${index + 1}${complete ? ", photo added" : ""}`}
              aria-current={active ? "step" : undefined}
              className={cn(
                "min-h-9 min-w-9 shrink-0 rounded-none border px-2 text-xs font-semibold transition-colors",
                active
                  ? "border-hilda-heading bg-hilda-heading text-hilda-inverse"
                  : complete
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-hilda-border/25 bg-hilda-surface text-hilda-text hover:border-hilda-border/30",
              )}
              onClick={() => onIndexChange(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
