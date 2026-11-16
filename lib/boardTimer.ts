import type { IntervalTimer, WorkoutPart } from './workoutNotation';
import { buildTimeline } from './intervalTimer';

export type BoardTimerMode = 'countup' | 'countdown' | 'emom' | 'intervals';

export type BoardTimerConfiguration = {
  mode: BoardTimerMode;
  minutes?: number;
  everyMinutes?: number;
  timer?: IntervalTimer;
};

const isIntegerBetween = (value: unknown, min: number, max: number) => (
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
);

export function getDefaultBoardTimerMode(part: Pick<WorkoutPart, 'format' | 'timer'>): BoardTimerMode {
  if (part.timer) return 'intervals';
  if (part.format === 'AMRAP') return 'countdown';
  if (part.format === 'EMOM') return 'emom';
  return 'countup';
}

export function getDefaultBoardTimerConfiguration(part: WorkoutPart): BoardTimerConfiguration {
  const mode = getDefaultBoardTimerMode(part);
  if (mode === 'intervals' && part.timer) return { mode, timer: part.timer };
  if (mode === 'countdown') return { mode, minutes: part.minutes || 12 };
  if (mode === 'emom') return { mode, minutes: part.minutes || 12, everyMinutes: 1 };
  return {
    mode,
    minutes: (part.format === 'FOR TIME' || part.format === 'CHIPPER') ? part.minutes : undefined,
  };
}

export function getBoardTimerConfigurationDuration(configuration: BoardTimerConfiguration) {
  switch (configuration.mode) {
    case 'countup':
      return configuration.minutes && configuration.minutes > 0 ? configuration.minutes * 60 : undefined;
    case 'countdown':
      return configuration.minutes ? configuration.minutes * 60 : undefined;
    case 'emom':
      return configuration.minutes && configuration.everyMinutes
        ? configuration.minutes * configuration.everyMinutes * 60
        : undefined;
    case 'intervals':
      return configuration.timer ? buildTimeline(configuration.timer).end : undefined;
  }
}

export function isBoardTimerConfiguration(value: unknown): value is BoardTimerConfiguration {
  if (!value || typeof value !== 'object') return false;
  const configuration = value as Partial<BoardTimerConfiguration>;
  if (configuration.mode === 'countup') {
    return configuration.minutes === undefined || isIntegerBetween(configuration.minutes, 0, 300);
  }
  if (configuration.mode === 'countdown') {
    return isIntegerBetween(configuration.minutes, 1, 300);
  }
  if (configuration.mode === 'emom') {
    return isIntegerBetween(configuration.minutes, 1, 50) &&
      isIntegerBetween(configuration.everyMinutes, 1, 10);
  }
  if (configuration.mode !== 'intervals' || !configuration.timer) return false;
  const timer = configuration.timer;
  return isIntegerBetween(timer.rounds, 1, 50) &&
    isIntegerBetween(timer.work, 5, 600) &&
    isIntegerBetween(timer.rest, 0, 300) &&
    isIntegerBetween(timer.sets, 1, 10) &&
    isIntegerBetween(timer.setRest, 0, 600) &&
    isIntegerBetween(timer.prep, 0, 30);
}

export function boardTimerConfigurationsEqual(
  left: BoardTimerConfiguration,
  right: BoardTimerConfiguration,
) {
  const leftMinutes = left.mode === 'countup' ? left.minutes || 0 : left.minutes;
  const rightMinutes = right.mode === 'countup' ? right.minutes || 0 : right.minutes;
  if (
    left.mode !== right.mode ||
    leftMinutes !== rightMinutes ||
    left.everyMinutes !== right.everyMinutes
  ) return false;
  if (!left.timer || !right.timer) return left.timer === right.timer;
  return left.timer.rounds === right.timer.rounds &&
    left.timer.work === right.timer.work &&
    left.timer.rest === right.timer.rest &&
    left.timer.sets === right.timer.sets &&
    left.timer.setRest === right.timer.setRest &&
    left.timer.prep === right.timer.prep;
}

export function getBoardTimerOverrideStorageKey(workoutId: number | string, partIndex: number) {
  return `pure-board-timer:${workoutId}:${partIndex}`;
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
