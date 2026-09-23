import { BugsIcon } from "@/components/icons/bugs-icon";
import { cn } from "@/lib/utils";

type BugsFoundBadgeProps = {
  className?: string;
  iconClassName?: string;
  /** When set, shown after the icon (e.g. pest type). */
  label?: string | null;
};

export function BugsFoundBadge({ className, iconClassName, label }: BugsFoundBadgeProps) {
  const trimmedLabel = typeof label === "string" ? label.trim() : "";
  const hasLabel = trimmedLabel.length > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-hilda-sm text-hilda-inverse",
        hasLabel ? "px-1.5 py-0" : "p-1",
        className,
      )}
      role="img"
      aria-label={hasLabel ? `Pests found: ${trimmedLabel}` : "Pests found"}
    >
      <BugsIcon className={iconClassName} />
      {hasLabel ? (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-hilda-inverse">
          {trimmedLabel}
        </span>
      ) : null}
    </span>
  );
}
