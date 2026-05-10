'use client';

import { useEffect, useRef } from 'react';

/**
 * Requests Screen Wake Lock on /wod so gym TVs (Chromium) are less likely to sleep.
 * Re-acquires when the tab becomes visible again.
 */
export default function WodScreenWake() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const acquire = async () => {
      if (!('wakeLock' in navigator) || !navigator.wakeLock) return;
      try {
        wakeLockRef.current?.release().catch(() => {});
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        // Denied, unsupported, or requires gesture — TV settings may still be needed
      }
    };

    void acquire();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, []);

  return null;
}
