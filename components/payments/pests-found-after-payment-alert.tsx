import { cn } from "@/lib/utils";

type PestsFoundAfterPaymentAlertProps = {
  className?: string;
  compact?: boolean;
};

/** Shown while visit is part_paid after late pests Yes (HIL-77 / HIL-128). */
export function PestsFoundAfterPaymentAlert({
  className,
  compact = false,
}: PestsFoundAfterPaymentAlertProps) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-hilda border border-amber-400 bg-amber-50 text-amber-950",
        compact ? "px-2 py-1.5 text-xs font-semibold" : "px-3 py-2.5 text-sm font-semibold",
        className,
      )}
    >
      {compact ? (
        <p>Pests found after payment — balance in POS Pending</p>
      ) : (
        <>
          <p className="leading-snug">Pests found after payment</p>
          <p className="mt-1 text-xs font-medium leading-snug text-amber-900/90">
            Standard was already taken. Load the pests surcharge cart from Shopify POS → Pending
            check-ins, then take the balance.
          </p>
        </>
      )}
    </div>
  );
}
