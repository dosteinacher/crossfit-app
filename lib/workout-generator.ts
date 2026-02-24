// Rule-based workout generator (no AI)

import { EXERCISES } from './workout-generator-data';
import type { WorkoutFormat } from './workout-generator-data';

export interface GeneratorInput {
  athleteCount: number;
  strengthIncluded: boolean;
  strengthBlock: string;
  durationMinutes: number;
  format: WorkoutFormat;
  includeExercises: string[];
  excludeExercises: string[];
}

export interface GeneratorOutput {
  title: string;
  description: string;
  workout_type: string;
}

function getAthleteLabel(count: number): string {
  if (count === 1) return 'Solo';
  if (count === 2) return 'Partner';
  return `Team of ${count}`;
}

function getExercisePool(include: string[], exclude: string[]): string[] {
  let pool = include.length > 0 ? [...include] : [...EXERCISES];
  pool = pool.filter((e) => !exclude.includes(e));
  if (pool.length === 0) pool = EXERCISES.filter((e) => !exclude.includes(e));
  return pool;
}

function pickExercises(pool: string[], count: number): string[] {
  if (pool.length <= count) return pool;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function formatMetcon(
  format: WorkoutFormat,
  duration: number,
  exercises: string[]
): string {
  const lines: string[] = [];
  switch (format) {
    case 'AMRAP':
      lines.push(`AMRAP ${duration} min`);
      lines.push('');
      exercises.forEach((e) => lines.push(`- ${e}`));
      break;
    case 'For Time':
      lines.push(`For Time (${duration} min cap)`);
      lines.push('3 Rounds:');
      exercises.forEach((e) => lines.push(`- ${e}`));
      break;
    case 'EMOM':
      lines.push(`EMOM ${duration} min`);
      lines.push('');
      exercises.forEach((e) => lines.push(`- ${e}`));
      break;
    case 'Rounds':
      lines.push(`${duration} min time cap`);
      lines.push('As many rounds as possible:');
      lines.push('');
      exercises.forEach((e) => lines.push(`- ${e}`));
      break;
    default:
      lines.push(`AMRAP ${duration} min`);
      lines.push('');
      exercises.forEach((e) => lines.push(`- ${e}`));
  }
  return lines.join('\n');
}

export function generateWorkout(input: GeneratorInput): GeneratorOutput {
  const {
    athleteCount,
    strengthIncluded,
    strengthBlock,
    durationMinutes,
    format,
    includeExercises,
    excludeExercises,
  } = input;

  const athleteLabel = getAthleteLabel(athleteCount);
  const hasStrength = strengthIncluded && strengthBlock.trim().length > 0;

  // Title
  let title = `${athleteLabel} WOD ${durationMinutes}min`;
  if (hasStrength) title += ' + Strength';

  // Workout type
  const workout_type = hasStrength ? 'Strength' : 'General';

  // Description
  const parts: string[] = [];

  if (hasStrength) {
    parts.push('Strength:');
    parts.push(strengthBlock.trim());
    parts.push('');
    parts.push('Metcon:');
    parts.push('');
  }

  const pool = getExercisePool(includeExercises, excludeExercises);
  const exerciseCount = Math.min(3 + Math.floor(durationMinutes / 15), 6);
  const chosen = pickExercises(pool, exerciseCount);
  parts.push(formatMetcon(format, durationMinutes, chosen));

  const description = parts.join('\n');

  return { title, description, workout_type };
}
