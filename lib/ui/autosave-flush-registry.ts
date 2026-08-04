type AutosaveFlusher = () => Promise<void>;

const flushers = new Set<AutosaveFlusher>();

/** Register an autosave flush callback (e.g. plant notes). Returns unregister. */
export function registerAutosaveFlusher(flush: AutosaveFlusher): () => void {
  flushers.add(flush);
  return () => {
    flushers.delete(flush);
  };
}

/** Await all registered dirty autosaves (modal Close, navigation). */
export async function flushAllAutosaves(): Promise<void> {
  const pending = [...flushers].map((flush) => flush());
  await Promise.all(pending);
}
