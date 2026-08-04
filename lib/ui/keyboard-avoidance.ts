/**
 * Keep the focused form control visible above the iPad software keyboard (HIL-110).
 * Uses visualViewport when available (Safari).
 */
export function scrollFocusedFieldAboveKeyboard(
  element: HTMLElement | null,
  options?: { marginPx?: number },
): void {
  if (!element || typeof window === "undefined") return;

  const margin = options?.marginPx ?? 16;

  window.requestAnimationFrame(() => {
    const vv = window.visualViewport;
    const rect = element.getBoundingClientRect();

    if (vv) {
      const visibleBottom = vv.offsetTop + vv.height;
      if (rect.bottom > visibleBottom - margin) {
        const delta = rect.bottom - (visibleBottom - margin);
        window.scrollBy({ top: delta, behavior: "smooth" });
        // Also scroll nearest overflow container (modal pane, check-in shell).
        scrollOverflowAncestors(element, delta);
      }
      return;
    }

    element.scrollIntoView({ block: "center", behavior: "smooth", inline: "nearest" });
  });
}

function scrollOverflowAncestors(element: HTMLElement, delta: number): void {
  let node: HTMLElement | null = element.parentElement;
  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight
    ) {
      node.scrollTop += delta;
      return;
    }
    node = node.parentElement;
  }
}

/** Bind focusin → scroll-into-view for a subtree. Returns cleanup. */
export function bindKeyboardAvoidance(root: HTMLElement | null): () => void {
  if (!root || typeof window === "undefined") {
    return () => undefined;
  }

  function onFocusIn(event: FocusEvent) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable
    ) {
      scrollFocusedFieldAboveKeyboard(target);
    }
  }

  function onViewportChange() {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      scrollFocusedFieldAboveKeyboard(active);
    }
  }

  root.addEventListener("focusin", onFocusIn);
  const vv = window.visualViewport;
  vv?.addEventListener("resize", onViewportChange);
  vv?.addEventListener("scroll", onViewportChange);

  return () => {
    root.removeEventListener("focusin", onFocusIn);
    vv?.removeEventListener("resize", onViewportChange);
    vv?.removeEventListener("scroll", onViewportChange);
  };
}
