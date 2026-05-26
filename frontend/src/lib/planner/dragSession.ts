/** One global drag session — prevents leaked window listeners when pointerup is lost. */
let activeCleanup: (() => void) | null = null;

/** Run the registered cleanup (if any) and clear the slot. */
export function endActiveDragSession() {
  const cleanup = activeCleanup;
  activeCleanup = null;
  cleanup?.();
}

/** Forget the active cleanup without running it (use when the owning drag is finishing normally). */
export function clearActiveDragSession(cleanup?: () => void) {
  if (!cleanup || activeCleanup === cleanup) {
    activeCleanup = null;
  }
}

export function startDragSession(cleanup: () => void) {
  endActiveDragSession();
  activeCleanup = cleanup;
}
