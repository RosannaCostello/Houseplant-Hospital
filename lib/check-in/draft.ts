import type { CheckInCustomer } from "@/lib/check-in/customer-schema";
import type { CheckInPlantPhoto } from "@/lib/check-in/photo-schema";
import type { CheckInPlant } from "@/lib/check-in/plant-schema";

const STORAGE_KEY = "hh-check-in-draft";

export type CheckInDraft = {
  customer: CheckInCustomer;
  plants?: CheckInPlant[];
  photos?: CheckInPlantPhoto[];
};

type DraftListener = () => void;

const listeners = new Set<DraftListener>();

/** Cached so useSyncExternalStore getSnapshot returns a stable reference. */
let cachedRaw: string | null | undefined;
let cachedSnapshot: CheckInDraft | null = null;

function invalidateCache() {
  cachedRaw = undefined;
  cachedSnapshot = null;
}

function parseDraft(raw: string | null): CheckInDraft | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CheckInDraft;
  } catch {
    return null;
  }
}

export function subscribeCheckInDraft(listener: DraftListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyCheckInDraftListeners() {
  for (const listener of listeners) {
    listener();
  }
}

/** Snapshot for useSyncExternalStore — returns a cached object when storage is unchanged. */
export function getCheckInDraftSnapshot(): CheckInDraft | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(STORAGE_KEY);

  if (raw === cachedRaw) {
    return cachedSnapshot;
  }

  cachedRaw = raw;
  cachedSnapshot = parseDraft(raw);
  return cachedSnapshot;
}

export function saveCheckInDraft(draft: CheckInDraft): void {
  if (typeof window === "undefined") return;

  const raw = JSON.stringify(draft);
  sessionStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedSnapshot = draft;
  notifyCheckInDraftListeners();
}

export function loadCheckInDraft(): CheckInDraft | null {
  return getCheckInDraftSnapshot();
}

export function clearCheckInDraft(): void {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(STORAGE_KEY);
  invalidateCache();
  notifyCheckInDraftListeners();
}
