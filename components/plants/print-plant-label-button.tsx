"use client";

import { useState, useTransition } from "react";
import { printPlantLabelAction } from "@/app/actions/print-plant-label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PrintPlantLabelButtonProps = {
  plantId: string;
  className?: string;
  /** Grey out when plant is collected (view-only). */
  disabled?: boolean;
};

export function PrintPlantLabelButton({
  plantId,
  className,
  disabled = false,
}: PrintPlantLabelButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onPrint() {
    if (disabled) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await printPlantLabelAction(plantId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
    });
  }

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full"
        disabled={isPending || disabled}
        onClick={onPrint}
      >
        {isPending ? "Sending…" : "Reprint label"}
      </Button>
      {disabled ? (
        <p className="text-sm text-hilda-text-muted">Collected — labels are view only</p>
      ) : null}
      {message ? <p className="text-sm text-hilda-text">{message}</p> : null}
      {error ? <p className="text-sm text-hilda-error-text">{error}</p> : null}
    </div>
  );
}
