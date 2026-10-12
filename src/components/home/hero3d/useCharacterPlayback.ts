import { useEffect } from "react";
import { CHARACTER_INTERVAL_MS } from "./characters";

/** No background timer while paused, off screen, reduced motion or tab hidden. */
export function useCharacterPlayback(enabled: boolean, advance: () => void) {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer);
      if (!document.hidden) timer = setInterval(advance, CHARACTER_INTERVAL_MS);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", sync); };
  }, [enabled, advance]);
}
