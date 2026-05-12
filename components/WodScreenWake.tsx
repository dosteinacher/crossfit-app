'use client';

import { useEffect, useRef } from 'react';

/**
 * Three-layer defence against TV sleep on /wod:
 *
 * 1. Screen Wake Lock API  — hints to the browser to keep the screen on.
 * 2. requestAnimationFrame canvas loop — updates a 1×1 px canvas at ~60 fps,
 *    keeping the GPU continuously active. This is the NoSleep.js technique and
 *    works on browsers that ignore Wake Lock (most Smart TV firmware).
 * 3. Live clock in WodClock.tsx — changes visible pixels every second as a
 *    final fallback for TVs that only check for static screen content.
 */
export default function WodScreenWake() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // --- 1. Wake Lock ---
    const acquireWakeLock = async () => {
      if (!('wakeLock' in navigator) || !navigator.wakeLock) return;
      try {
        wakeLockRef.current?.release().catch(() => {});
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        // Not supported or denied — canvas loop still runs
      }
    };
    void acquireWakeLock();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquireWakeLock();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // --- 2. Continuous canvas animation at 60 fps ---
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    // Position off-screen so it's invisible but still rendered by the GPU
    canvas.style.cssText = 'position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0.01;pointer-events:none;';
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    let frame = 0;

    const tick = () => {
      if (ctx) {
        // Alternate between two near-identical colours so the pixel always changes
        ctx.fillStyle = frame % 2 === 0 ? '#010101' : '#020202';
        ctx.fillRect(0, 0, 1, 1);
        frame++;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      canvasRef.current?.remove();
    };
  }, []);

  return null;
}
