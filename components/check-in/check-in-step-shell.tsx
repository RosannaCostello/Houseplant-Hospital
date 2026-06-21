import { cn } from "@/lib/utils";

type CheckInStepShellProps = {
  header: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
  status?: React.ReactNode;
  maxWidth?: "2xl" | "3xl";
};

export function CheckInStepShell({
  header,
  children,
  footer,
  status,
  maxWidth = "2xl",
}: CheckInStepShellProps) {
  return (
    <div
      className={cn(
        "mx-auto flex h-full min-h-0 w-full flex-col pb-[var(--bottom-nav-inset)]",
        maxWidth === "3xl" ? "max-w-3xl" : "max-w-2xl",
      )}
    >
      <div className="shrink-0">{header}</div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">{children}</div>

      {status ? <div className="shrink-0 space-y-1 pt-2">{status}</div> : null}

      <div className="shrink-0 border-t border-hilda-border/10 pt-3">{footer}</div>
    </div>
  );
}
