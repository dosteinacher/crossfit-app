export type PersistedIntervalTimer = {
  accumulated: number;
  startedAt: number | null;
  running: boolean;
};

export function getIntervalTimerStorageKey(workoutId: number | string, partIndex: number) {
  return `pure-interval-timer:${workoutId}:${partIndex}`;
}

export function restoreIntervalTimerState(
  value: unknown,
  now: number,
  end: number,
): PersistedIntervalTimer | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const saved = value as Partial<PersistedIntervalTimer>;
  if (
    typeof saved.accumulated !== 'number' ||
    !Number.isFinite(saved.accumulated) ||
    saved.accumulated < 0 ||
    typeof saved.running !== 'boolean' ||
    !(saved.startedAt === null || (typeof saved.startedAt === 'number' && Number.isFinite(saved.startedAt))) ||
    (saved.running && saved.startedAt === null)
  ) {
    return undefined;
  }

  const startedAt = typeof saved.startedAt === 'number' ? saved.startedAt : null;
  const elapsed = saved.running && startedAt !== null
    ? saved.accumulated + Math.max(0, Math.floor((now - startedAt) / 1000))
    : saved.accumulated;
  if (elapsed >= end) {
    return { accumulated: end, startedAt: null, running: false };
  }
  return {
    accumulated: saved.accumulated,
    startedAt: saved.running ? startedAt : null,
    running: saved.running,
  };
}

export function pausePersistedIntervalTimer(
  saved: PersistedIntervalTimer,
  now: number,
): PersistedIntervalTimer {
  const accumulated = saved.running && saved.startedAt !== null
    ? saved.accumulated + Math.max(0, Math.floor((now - saved.startedAt) / 1000))
    : saved.accumulated;
  return { accumulated, startedAt: null, running: false };
}

export function pauseStoredIntervalTimer(workoutId: number | string, partIndex: number) {
  if (typeof window === 'undefined') return;
  const storageKey = getIntervalTimerStorageKey(workoutId, partIndex);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    const now = Date.now();
    const saved = restoreIntervalTimerState(parsed, now, Number.MAX_SAFE_INTEGER);
    if (!saved) {
      console.warn('Could not pause malformed interval timer state:', storageKey);
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(pausePersistedIntervalTimer(saved, now)));
  } catch (storageError) {
    console.warn('Could not pause interval timer before changing parts:', storageError);
  }
}
