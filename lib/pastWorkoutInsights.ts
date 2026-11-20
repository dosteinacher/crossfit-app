/**
 * Phase 4 "Copy a past workout" and movement autocomplete — pure helpers over
 * a list of past workouts (as returned by the public /api/workouts/all).
 */
import { getWorkoutFormat } from './workout-description';
import { parseWorkout } from './workoutNotation';

export interface PastWorkoutSummary {
  id: number;
  title: string;
  date: string;
  description: string;
}

export interface PastWorkoutListEntry {
  id: number;
  title: string;
  date: string;
  formats: string;
}

/** A short "title, date, formats" summary line for the "Copy a past workout" list. */
export function summarizePastWorkouts(workouts: PastWorkoutSummary[]): PastWorkoutListEntry[] {
  return workouts.map((workout) => {
    const details = getWorkoutFormat({ title: workout.title, description: workout.description });
    const formats = [
      details.format,
      details.minutes ? `${details.minutes}′` : '',
      details.team,
    ].filter(Boolean).join(' · ');
    return { id: workout.id, title: workout.title, date: workout.date, formats };
  });
}

export interface MovementSuggestion {
  name: string;
  count: number;
  /** The most common load / easier-option seen for this movement, if any. */
  mostCommonLoad?: string;
  mostCommonAlt?: string;
}

function mostCommon(values: string[]): string | undefined {
  if (!values.length) return undefined;
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Movement names seen across past workouts, most frequent first, with their usual load/alt. */
export function getMovementSuggestions(workouts: PastWorkoutSummary[], limit = 200): MovementSuggestion[] {
  const byName = new Map<string, { count: number; loads: string[]; alts: string[] }>();
  for (const workout of workouts) {
    const { parts } = parseWorkout(workout.description || '');
    for (const part of parts) {
      for (const block of part.blocks) {
        if (block.type !== 'movement' || !block.name) continue;
        const entry = byName.get(block.name) || { count: 0, loads: [], alts: [] };
        entry.count += 1;
        if (block.load) entry.loads.push(block.load);
        if (block.alt) entry.alts.push(block.alt);
        byName.set(block.name, entry);
      }
    }
  }
  return [...byName.entries()]
    .map(([name, entry]) => ({
      name,
      count: entry.count,
      mostCommonLoad: mostCommon(entry.loads),
      mostCommonAlt: mostCommon(entry.alts),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
