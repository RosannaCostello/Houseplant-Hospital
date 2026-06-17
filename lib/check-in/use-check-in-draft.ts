"use client";

import { useSyncExternalStore } from "react";
import {
  getCheckInDraftSnapshot,
  subscribeCheckInDraft,
  type CheckInDraft,
} from "@/lib/check-in/draft";

function getServerSnapshot(): CheckInDraft | null {
  return null;
}

export function useCheckInDraft(): CheckInDraft | null {
  return useSyncExternalStore(subscribeCheckInDraft, getCheckInDraftSnapshot, getServerSnapshot);
}
