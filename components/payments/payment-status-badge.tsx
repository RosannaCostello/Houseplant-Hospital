import type { PosPaymentStatus } from "@/lib/shopify/pos-checkout-types";
import { cn } from "@/lib/utils";

type PaymentStatusBadgeProps = {
  status: PosPaymentStatus | null;
  shopifyOrderId?: string | null;
  compact?: boolean;
  className?: string;
};

export function paymentStatusLabel(
  status: PosPaymentStatus | null,
  shopifyOrderId?: string | null,
  compact = false,
): string {
  if (compact) {
    if (status === "paid") return "Paid";
    if (status === "part_paid") return "Part paid";
    return "Unpaid";
  }

  if (status === "paid") return shopifyOrderId ? "Shopify paid" : "Paid";
  if (status === "part_paid") return "Part paid — pests balance";
  if (status === "pay_at_collection") return "Pay at collection";
  if (status === "loaded") return "Loaded in POS";
  if (status === "queued") return "Waiting for POS";
  return "Unpaid";
}

export function PaymentStatusBadge({ status, shopifyOrderId, compact = false, className }: PaymentStatusBadgeProps) {
  const paid = status === "paid";
  const partPaid = status === "part_paid";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-hilda-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        paid
          ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
          : partPaid
            ? "bg-amber-100 text-amber-950 ring-1 ring-amber-300"
            : "bg-hilda-warning-bg text-hilda-warning-text ring-1 ring-hilda-warning-border",
        className,
      )}
    >
      {paymentStatusLabel(status, shopifyOrderId, compact)}
    </span>
  );
}
