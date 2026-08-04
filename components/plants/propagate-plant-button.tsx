"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { propagatePlantAction } from "@/app/actions/propagate-plant";
import { Button } from "@/components/ui/button";
import { PLANT_SIZES, isPlantSize, type PlantSize } from "@/lib/plant-size";
import { lockBodyScroll } from "@/lib/ui/body-scroll-lock";
import { STAFF_OVERLAY_Z } from "@/lib/ui/overlay-z";
import { cn } from "@/lib/utils";

type PropagatePlantButtonProps = {
  plantId: string;
  initialSize: string;
  disabledReason?: string;
  className?: string;
  onSuccess?: () => void;
};

function sizeLabel(size: PlantSize): string {
  return size === "XS" ? "MINI" : size;
}

export function PropagatePlantButton({
  plantId,
  initialSize,
  disabledReason,
  className,
  onSuccess,
}: PropagatePlantButtonProps) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<PlantSize>(isPlantSize(initialSize) ? initialSize : "M");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    const unlock = lockBodyScroll();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlock();
    };
  }, [isPending, open]);

  function confirmPropagation() {
    setError(null);
    startTransition(async () => {
      const result = await propagatePlantAction(plantId, size);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setOpen(false);
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <div className="w-full">
      <Button
        type="button"
        variant="outline"
        className={cn("w-full", className)}
        disabled={Boolean(disabledReason)}
        aria-haspopup="dialog"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Propagate
      </Button>
      {disabledReason ? (
        <p className="mt-1 text-center text-xs text-hilda-text-muted">{disabledReason}</p>
      ) : null}

      {open
        ? createPortal(
            <div className={cn("fixed inset-0 flex items-center justify-center p-4", STAFF_OVERLAY_Z)}>
              <button
                type="button"
                className="absolute inset-0 bg-hilda-heading/50"
                aria-label="Close propagation confirmation"
                disabled={isPending}
                onClick={() => setOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className="relative z-10 w-full max-w-sm rounded-hilda border border-hilda-border/15 bg-hilda-surface shadow-xl"
              >
                <div className="border-b border-hilda-border/10 px-4 py-3">
                  <h2 id={titleId} className="font-serif text-lg text-hilda-heading">
                    Propagate plant
                  </h2>
                  <p id={descriptionId} className="mt-1 text-sm text-hilda-text">
                    Are you sure you want to propagate this plant. This will create a new plant in
                    the propagation column on the dashboard
                  </p>
                </div>

                <div className="space-y-3 p-4">
                  <fieldset disabled={isPending}>
                    <legend className="text-sm font-semibold text-hilda-heading">
                      Plant propagation size
                    </legend>
                    <div className="mt-2 grid grid-cols-5 gap-1.5">
                      {PLANT_SIZES.map((option) => (
                        <label key={option} className="cursor-pointer">
                          <input
                            type="radio"
                            name={`${titleId}-size`}
                            value={option}
                            checked={size === option}
                            className="peer sr-only"
                            onChange={() => setSize(option)}
                          />
                          <span className="flex min-h-11 items-center justify-center rounded-hilda-sm border border-hilda-border/20 bg-hilda-surface px-1 text-xs font-semibold text-hilda-heading peer-checked:border-hilda-bugs peer-checked:bg-hilda-bugs peer-checked:text-hilda-inverse">
                            {sizeLabel(option)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {error ? <p className="text-sm text-hilda-error-text">{error}</p> : null}
                  <Button type="button" className="w-full" disabled={isPending} onClick={confirmPropagation}>
                    {isPending ? "Propagating…" : "Confirm propagation"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isPending}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
