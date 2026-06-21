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
        "absolute flex items-center justify-center rounded-none p-1 text-white",
        className,
      )}
      role="img"
      aria-label="Bugs found"
    >
      <BugsIcon className={iconClassName} />
    </span>
  );
}
