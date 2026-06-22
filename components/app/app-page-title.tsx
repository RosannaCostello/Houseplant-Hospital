"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AppPageTitleContextValue = {
  title: string | null;
  setTitle: (title: string | null) => void;
};

const AppPageTitleContext = createContext<AppPageTitleContextValue | null>(null);

export function AppPageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  const value = useMemo(() => ({ title, setTitle }), [title]);

  return <AppPageTitleContext.Provider value={value}>{children}</AppPageTitleContext.Provider>;
}

export function useAppPageTitle(): string | null {
  const context = useContext(AppPageTitleContext);
  return context?.title ?? null;
}

export function SetPageTitle({ title }: { title: string }) {
  const context = useContext(AppPageTitleContext);

  useEffect(() => {
    if (!context) return undefined;
    context.setTitle(title);
    return () => context.setTitle(null);
  }, [context, title]);

  return null;
}
