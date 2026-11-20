/**
 * Phase 5 — plain-language, non-blocking checks shown above the save button.
 * None of these stop a workout from being saved; each just points at
 * something that's probably missing, with a one-click fix.
 */
import type { Part } from './workoutModel';

export type WorkoutCheckKind = 'minutes' | 'movements' | 'rounds' | 'timer';

export interface WorkoutCheck {
  partIndex: number;
  kind: WorkoutCheckKind;
  message: string;
  fixLabel: string;
}

function impliedTimerMode(part: Part): 'countup' | 'countdown' | 'emom' | 'intervals' {
  if (part.timer) return 'intervals';
  if (part.timerMode === 'countdown') return 'countdown';
  if (part.timerMode === 'countup') return 'countup';
  if (part.format === 'AMRAP') return 'countdown';
  if (part.format === 'EMOM') return 'emom';
  return 'countup';
}

export function getWorkoutChecks(parts: Part[]): WorkoutCheck[] {
  const checks: WorkoutCheck[] = [];
  parts.forEach((part, index) => {
    const label = part.title.trim() || `Part ${index + 1}`;
    const mode = impliedTimerMode(part);

    if (!part.minutes.trim() && (mode === 'countdown' || mode === 'emom')) {
      checks.push({
        partIndex: index,
        kind: 'minutes',
        message: `${label} has no minutes`,
        fixLabel: 'Add minutes',
      });
    }

    if (!part.items.some((item) => item.kind === 'movement')) {
      checks.push({
        partIndex: index,
        kind: 'movements',
        message: `${label} is ${part.format === 'Other' ? (part.otherName || 'Other') : part.format} but has no movements`,
        fixLabel: 'Add movement',
      });
    }

    if (part.format === 'Rounds' && !part.rounds?.trim()) {
      checks.push({
        partIndex: index,
        kind: 'rounds',
        message: `${label} is Rounds without a number of rounds`,
        fixLabel: 'Add rounds',
      });
    }

    const intendsIntervals = part.format === 'Intervals' || part.timerMode === 'intervals';
    if (intendsIntervals && !part.timer) {
      checks.push({
        partIndex: index,
        kind: 'timer',
        message: `${label} is Intervals without a timer`,
        fixLabel: 'Set timer',
      });
    }
  });
  return checks;
}
