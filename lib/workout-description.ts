import { detectWorkoutFormat, parseWorkout, type WorkoutPart } from '@/lib/workoutNotation';

export type WorkoutFormat = NonNullable<WorkoutPart['format']>;
export type WorkoutFormatStamp = { label: string; variant: 'format' | 'meta' | 'benchmark' };
export interface WorkoutFormatDetails {
  format?: WorkoutFormat;
  minutes?: number;
  team?: string;
  benchmark?: string;
}

type WorkoutFormatInput = { title?: string | null; description?: string | null };

function partText(part: WorkoutPart) {
  return [
    part.title,
    part.format || '',
    part.team || '',
    ...part.meta,
    ...part.blocks.map((block) => block.name),
  ].join('\n');
}

function isWarmupOrCooldown(part: WorkoutPart) {
  return /warm[\s-]?up|aufwärmen|cool[\s-]?down|abkühlen/i.test(part.title);
}

function findWorkoutPart(parts: WorkoutPart[]) {
  const activeParts = parts.filter((part) => !isWarmupOrCooldown(part));
  const candidates = activeParts.filter((part) =>
    /\bwod\b|\bworkout\b/i.test(part.title) ||
    Boolean(part.format) ||
    /\b(?:amrap|emom|for time|auf zeit|chipper|intervals?|skill|strength|kraft)\b/i.test(partText(part))
  );
  return [...(candidates.length ? candidates : activeParts)].at(-1) || parts.at(-1);
}

function detectBenchmark(text: string): string | undefined {
  const benchmark = text.match(/\b(Fran|Grace|Helen|Diane|Isabel|Karen|Annie|Murph|Cindy|Jackie|Elizabeth|Nancy|DT|Open\s+\d{2}\.\d)\b/i);
  if (benchmark) return benchmark[1].replace(/\s+/g, ' ').toUpperCase();
  const quoted = text.match(/[“„«"](.*?)[“”»"]/);
  return quoted?.[1]?.trim().toUpperCase() || undefined;
}

function detectTeam(text: string) {
  const team = text.match(/\bteam(?:s)?\s+(?:of|von)\s+(\d+)\b/i);
  return team ? `TEAM OF ${team[1]}` : undefined;
}

function isRepScheme(value: string) {
  const normalized = value.replace(/\s+/g, '').replace(/[–—]/g, '-');
  return /^\d+(?:[-/]\d+){1,}$|^\d+[x×]\d+$|^\d{2,3}$/i.test(normalized);
}

export function getWorkoutFormat(workout: WorkoutFormatInput): WorkoutFormatDetails {
  const title = typeof workout?.title === 'string' ? workout.title : '';
  const description = typeof workout?.description === 'string' ? workout.description : '';
  const { parts } = parseWorkout(description);
  const part = findWorkoutPart(parts);
  const selectedText = part ? partText(part) : '';
  const combinedText = `${title}\n${selectedText}\n${description}`;
  const format = part?.format || detectWorkoutFormat(selectedText) || detectWorkoutFormat(title);
  const minutesMatch = selectedText.match(/\b(\d+)\s*(?:min(?:ute)?s?\b|′|')/i);
  const team = part?.team ? part.team.toUpperCase() : detectTeam(combinedText);
  const benchmark = detectBenchmark(`${title}\n${selectedText}\n${description}`);
  return {
    ...(format ? { format } : {}),
    ...(part?.minutes || minutesMatch ? { minutes: part?.minutes || Number(minutesMatch?.[1]) } : {}),
    ...(team ? { team } : {}),
    ...(benchmark ? { benchmark } : {}),
  };
}

export function getWorkoutFormatStamps(workout: WorkoutFormatInput): WorkoutFormatStamp[] {
  const details = getWorkoutFormat(workout);
  const { parts } = parseWorkout(workout?.description || '');
  const mainPart = findWorkoutPart(parts);
  const stamps: WorkoutFormatStamp[] = [];
  if (details.format) {
    stamps.push({
      label: details.format === 'FOR TIME' && details.minutes
        ? `FOR TIME · CAP ${details.minutes}′`
        : details.minutes
          ? `${details.format} ${details.minutes}′`
          : details.format,
      variant: 'format',
    });
  }
  const teamMeta = mainPart?.meta.some((value) => /\bteam(?:s)?\s+(?:of|von)\s+\d+\b/i.test(value));
  if (details.team && !teamMeta) stamps.push({ label: details.team, variant: 'meta' });
  for (const meta of mainPart?.meta || []) {
    stamps.push({ label: meta.toUpperCase(), variant: 'meta' });
  }
  if (details.benchmark) stamps.push({ label: details.benchmark, variant: 'benchmark' });
  return stamps;
}

export function getWorkoutScoreboard(workout: WorkoutFormatInput) {
  const { parts } = parseWorkout(workout?.description || '');
  const part = findWorkoutPart(parts);
  if (!part) return null;
  const schemeBlock = part.blocks.find((block) =>
    block.type === 'scheme' && isRepScheme(block.name)
  );
  const movementScheme = part.blocks.find((block) =>
    block.type === 'movement' && block.reps && isRepScheme(block.reps)
  );
  const schemeValue = schemeBlock?.name || movementScheme?.reps;
  const scheme = schemeValue?.replace(/\s+/g, '').replace(/[×–—]/g, (value) => value === '×' ? 'x' : '-');
  const movements = part.blocks
    .filter((block) => block.type === 'movement')
    .map((block) => block.name)
    .filter(Boolean)
    .slice(0, 4);
  return scheme ? { scheme, movements } : null;
}
