"use client";

import { useState, useTransition } from "react";
import { printPlantLabelAction } from "@/app/actions/print-plant-label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PrintPlantLabelButtonProps = {
  plantId: string;
  className?: string;
};

export function PrintPlantLabelButton({ plantId, className }: PrintPlantLabelButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onPrint() {
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
        disabled={isPending}
        onClick={onPrint}
      >
        {isPending ? "Sending…" : "Print label"}
      </Button>
      {message ? <p className="text-sm text-hilda-text">{message}</p> : null}
      {error ? <p className="text-sm text-hilda-error-text">{error}</p> : null}
    </div>
  );
}
