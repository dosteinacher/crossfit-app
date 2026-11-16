import type { WorkoutPart } from './workoutNotation';

export type BoardTimerMode = 'countup' | 'countdown' | 'emom' | 'intervals';

export function getDefaultBoardTimerMode(part: Pick<WorkoutPart, 'format' | 'timer'>): BoardTimerMode {
  if (part.timer) return 'intervals';
  if (part.format === 'AMRAP') return 'countdown';
  if (part.format === 'EMOM') return 'emom';
  return 'countup';
}

export function getBoardTimerDuration(part: WorkoutPart, mode: BoardTimerMode) {
  if (mode === 'intervals') return undefined;
  if (mode === 'countup') {
    return (part.format === 'FOR TIME' || part.format === 'CHIPPER') && part.minutes
      ? part.minutes * 60
      : undefined;
  }
  return part.minutes ? part.minutes * 60 : undefined;
}
