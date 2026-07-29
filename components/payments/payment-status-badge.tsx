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
    return status === "paid" ? "Paid" : "Unpaid";
  }

  if (status === "paid") return shopifyOrderId ? "Shopify paid" : "Paid";
  if (status === "pay_at_collection") return "Pay at collection";
  if (status === "loaded") return "Loaded in POS";
  if (status === "queued") return "Waiting for POS";
  return "Unpaid";
}

export function PaymentStatusBadge({ status, shopifyOrderId, compact = false, className }: PaymentStatusBadgeProps) {
  const paid = status === "paid";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-hilda-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        paid
          ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
          : "bg-hilda-warning-bg text-hilda-warning-text ring-1 ring-hilda-warning-border",
        className,
      )}
    >
      {paymentStatusLabel(status, shopifyOrderId, compact)}
    </span>
  );
}
