import type { WorkoutBlock } from '@/lib/workoutNotation';

export function getTotalMovementCount(groups: Array<{ blocks: WorkoutBlock[] }>) {
  return groups.reduce(
    (total, group) => total + group.blocks.filter((block) => block.type === 'movement').length,
    0
  );
}

export function getFitScaleCandidates(preferredScale: number) {
  const preferred = Number.isFinite(preferredScale) ? Math.max(0.1, preferredScale) : 1;
  const cappedPreferred = Math.min(1.6, preferred);
  const upscales = [1.6, 1.5, 1.4, 1.3, 1.2, 1.1];
  const downscales = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
  const candidates = [...upscales, ...downscales].filter((scale) => scale <= cappedPreferred);

  if (preferred >= 1.6) return candidates;
  if (preferred >= 1.1) return [preferred, ...downscales];
  return [preferred, ...downscales.filter((scale) => scale < preferred)];
}

export function getUniqueWorkoutStamps(stamps: Array<string | undefined>) {
  const seen = new Set<string>();
  return stamps.filter((stamp): stamp is string => {
    if (!stamp) return false;
    const key = stamp.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
