'use client';

import { useEffect } from 'react';

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes — well within the 10-min backend TTL

/**
 * Keeps a demo widget container alive via periodic heartbeat POSTs.
 *
 * Covers three failure modes:
 *  1. First-load gap — sends an immediate heartbeat on mount so the reaper
 *     can't kill the container in the 0→60 s window before the first interval fires.
 *  2. Backgrounded tab throttling — browsers throttle setInterval to ≥ 5 min
 *     in background tabs. A `visibilitychange` listener fires a heartbeat the
 *     moment the user returns to the tab.
 *  3. Network blip recovery — an `online` listener resends the heartbeat as
 *     soon as connectivity is restored after a dropped connection.
 */
export function useWidgetHeartbeat(widgetId: string) {
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
    const url = `${apiUrl}/api/demo/widgets/${widgetId}/heartbeat`;

    const beat = () => {
      fetch(url, { method: 'POST', cache: 'no-store' }).catch(() => {
        // Fire-and-forget — silent failure is acceptable; next beat will retry
      });
    };

    // 1. Immediate beat on mount
    beat();

    // 2. Periodic beat (guards against normal expiry)
    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);

    // 3. Beat on visibility regained (guards against browser tab throttling)
    const onVisible = () => {
      if (document.visibilityState === 'visible') beat();
    };
    document.addEventListener('visibilitychange', onVisible);

    // 4. Beat on network reconnect (guards against connectivity blips)
    window.addEventListener('online', beat);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', beat);
    };
  }, [widgetId]);
}
