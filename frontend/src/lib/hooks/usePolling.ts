import { useEffect, useRef } from "react";

// Runs `callback` every `intervalMs` while the tab is visible, and once more when it
// becomes visible again. A null interval stops polling. The first fetch is the caller's.
export function usePolling(callback: () => void, intervalMs: number | null) {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (intervalMs === null) return;

    const tick = () => {
      if (!document.hidden) saved.current();
    };
    const interval = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs]);
}
