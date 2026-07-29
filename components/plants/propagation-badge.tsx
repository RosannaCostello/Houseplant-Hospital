import { cn } from "@/lib/utils";

export function PropagationBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-5 items-center rounded-hilda-sm bg-hilda-bugs px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-hilda-inverse shadow-sm",
        className,
      )}
    >
      Propagation
    </span>
  );
}
