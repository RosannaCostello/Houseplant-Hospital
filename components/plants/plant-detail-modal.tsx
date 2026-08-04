"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  getPlantDetailModalAction,
  type PlantDetailModalPayload,
} from "@/app/actions/get-plant-detail-modal";
import { PlantDetailView } from "@/components/plants/plant-detail-view";
import { formatCustomerPlantTitle } from "@/lib/plants/format-customer-plant-title";

type PlantDetailModalContextValue = {
  openPlantDetail: (plantId: string) => void;
  closePlantDetail: () => void;
};

const PlantDetailModalContext = createContext<PlantDetailModalContextValue | null>(null);

export function usePlantDetailModal(): PlantDetailModalContextValue {
  const value = useContext(PlantDetailModalContext);
  if (!value) {
    throw new Error("usePlantDetailModal must be used within PlantDetailModalProvider");
  }
  return value;
}

/** Safe for optional use outside provider (falls back to no-ops). */
export function useOptionalPlantDetailModal(): PlantDetailModalContextValue | null {
  return useContext(PlantDetailModalContext);
}

export function PlantDetailModalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const titleId = useId();
  const [plantId, setPlantId] = useState<string | null>(null);
  const [loadToken, setLoadToken] = useState(0);
  const [payload, setPayload] = useState<PlantDetailModalPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const closePlantDetail = useCallback(() => {
    setPlantId(null);
    setPayload(null);
    setError(null);
  }, []);

  const openPlantDetail = useCallback((id: string) => {
    setPlantId(id);
    setPayload(null);
    setError(null);
    setLoadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!plantId) return;

    let cancelled = false;
    startTransition(async () => {
      const result = await getPlantDetailModalAction(plantId);
      if (cancelled) return;
      if (!result.success) {
        setError(result.error);
        setPayload(null);
        return;
      }
      setPayload(result.data);
      setError(null);
    });

    return () => {
      cancelled = true;
    };
  }, [plantId, loadToken]);

  useEffect(() => {
    if (!plantId) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePlantDetail();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closePlantDetail, plantId]);

  const value: PlantDetailModalContextValue = {
    openPlantDetail,
    closePlantDetail,
  };

  const open = Boolean(plantId);
  const heading =
    payload?.plant != null
      ? formatCustomerPlantTitle(payload.plant.customer)
      : "Update plant";

  return (
    <PlantDetailModalContext.Provider value={value}>
      {children}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4">
              <button
                type="button"
                className="absolute inset-0 bg-hilda-heading/45"
                aria-label="Close plant detail"
                onClick={closePlantDetail}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-10 flex max-h-[min(92dvh,56rem)] w-full max-w-4xl flex-col overflow-hidden rounded-t-hilda border border-hilda-border/15 bg-hilda-bg shadow-xl sm:rounded-hilda"
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hilda-border/10 bg-hilda-surface px-4 py-3">
                  <h2 id={titleId} className="min-w-0 truncate font-serif text-lg text-hilda-heading">
                    {heading}
                  </h2>
                  <button
                    type="button"
                    className="shrink-0 rounded-hilda-sm border border-hilda-border/20 bg-hilda-bg px-3 py-1.5 text-sm font-medium text-hilda-heading hover:bg-hilda-surface"
                    onClick={() => {
                      closePlantDetail();
                      router.refresh();
                    }}
                  >
                    Close
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
                  {error ? <p className="text-sm text-hilda-error-text">{error}</p> : null}
                  {isPending && !payload ? (
                    <p className="text-sm text-hilda-text-muted">Loading plant…</p>
                  ) : null}
                  {payload ? (
                    <PlantDetailView
                      plant={payload.plant}
                      pricing={payload.pricing}
                      careTipOptions={payload.careTipOptions}
                      pestTreatmentOptions={payload.pestTreatmentOptions}
                      treatmentNotesPlaceholder={payload.treatmentNotesPlaceholder}
                      embeddedInModal
                    />
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </PlantDetailModalContext.Provider>
  );
}
