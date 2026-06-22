import { BugsIcon } from "@/components/icons/bugs-icon";
import { cn } from "@/lib/utils";

type BugsFoundBadgeProps = {
  className?: string;
  iconClassName?: string;
};

export function BugsFoundBadge({ className, iconClassName }: BugsFoundBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-none p-1 text-hilda-inverse",
        className,
      )}
      role="img"
      aria-label="Bugs found"
    >
      <BugsIcon className={iconClassName} />
    </span>
  );
}
