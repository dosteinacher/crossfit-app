export interface WorkoutMovement {
  reps: string | null;
  movement: string;
}

export interface WorkoutDescriptionPart {
  sectionTitle: string;
  title: string;
  durationMinutes?: number;
  lines: string[];
  movements: WorkoutMovement[];
}

export type WorkoutFormat = 'AMRAP' | 'EMOM' | 'FOR TIME' | 'CHIPPER' | 'INTERVALS' | 'SKILL' | 'STRENGTH';
export type WorkoutFormatStamp = { label: string; variant: 'format' | 'meta' | 'benchmark' };
export interface WorkoutFormatDetails {
  format?: WorkoutFormat;
  minutes?: number;
  team?: string;
  benchmark?: string;
}

type WorkoutFormatInput = { title?: string | null; description?: string | null };

const SECTION_KEYWORDS = [
  'Warm[\\s-]?up',
  'Aufwärmen',
  'Strength',
  'Skill',
  'WOD',
  'Workout',
  'Finisher',
  'Cool[\\s-]?down',
].join('|');

function splitMovement(line: string): WorkoutMovement {
  const match = line.match(/^(\d+(?:\s*(?:[-/]|[x×])\s*\d+)*)(?:\s*[x×])?\s+(.+)$/i);
  return match
    ? { reps: match[1].replace(/\s+/g, ' ').trim(), movement: match[2].trim() }
    : { reps: null, movement: line.trim() };
}

function splitLines(text: string) {
  return text
    .split(/\s+-\s+|\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function sectionStarts(text: string, pattern: RegExp) {
  return Array.from(text.matchAll(pattern), (match) => {
    const matchIndex = match.index ?? 0;
    const leadingWhitespace = match[0].length - match[0].trimStart().length;
    return matchIndex + leadingWhitespace;
  });
}

function splitSections(text: string) {
  const numberedStarts = sectionStarts(text, /(?:^|\s)\d+\.\s+/g);
  const starts = numberedStarts.length
    ? numberedStarts
    : sectionStarts(text, new RegExp(`(?:^|\\s)(?=${SECTION_KEYWORDS})`, 'gi'));

  return starts
    .map((start, index) => text.slice(start, starts[index + 1] ?? text.length).trim())
    .filter(Boolean);
}

function parsePart(section: string, numbered: boolean): WorkoutDescriptionPart {
  const content = numbered ? section.replace(/^\d+\.\s*/, '') : section;
  const headingBoundary = content.search(/\s+[–—-]\s+|:\s*|\r?\n|\s+(?=\d+\s*Min\b)/i);
  const sectionTitle = (headingBoundary === -1 ? '' : content.slice(0, headingBoundary)).trim() || 'Workout';
  const details = headingBoundary === -1 ? '' : content.slice(headingBoundary).replace(/^\s*(?:[–—-]|:)?\s*/, '');
  const durationMinutes = Number(details.match(/(\d+)\s*Min/i)?.[1] || content.match(/(\d+)\s*Min/i)?.[1]) || undefined;
  const lines = splitLines(details || content);
  const filteredLines = lines.filter((line) => !/^\d+\s*Min\b/i.test(line));
  const firstLine = filteredLines[0];
  const hasContentTitle = Boolean(firstLine && !/^(?:\d+(?:\s*(?:[-/]|[x×])\s*\d+)*|AMRAP\b|EMOM\b|For Time\b)/i.test(firstLine));
  const title = hasContentTitle ? firstLine : sectionTitle;
  const contentLines = hasContentTitle ? filteredLines.slice(1) : filteredLines;

  return {
    sectionTitle,
    title,
    ...(durationMinutes ? { durationMinutes } : {}),
    lines: contentLines,
    movements: contentLines.map(splitMovement),
  };
}

export function parseWorkoutDescription(text: string): WorkoutDescriptionPart[] {
  const source = typeof text === 'string' ? text : '';
  const sections = splitSections(source);
  if (sections.length > 0) {
    const hasNumberedSections = /(?:^|\s)\d+\.\s+/.test(source);
    return sections.map((section) => parsePart(section, hasNumberedSections));
  }
  return source ? [parsePart(source, false)] : [{
    sectionTitle: 'Workout',
    title: 'Workout',
    lines: [],
    movements: [],
  }];
}

function partText(part: WorkoutDescriptionPart) {
  return [part.sectionTitle, part.title, ...part.lines].join('\n');
}

export function getWorkoutWodPart(workout: WorkoutFormatInput): WorkoutDescriptionPart {
  const parts = parseWorkoutDescription(workout.description || '');
  const activeParts = parts.filter((part) =>
    !/warm[\s-]?up|aufwärmen|cool[\s-]?down|abkühlen/i.test(part.sectionTitle)
  );
  const wodParts = activeParts.filter((part) =>
    /\bwod\b|\bworkout\b/i.test(part.sectionTitle) ||
    /\b(?:amrap|emom|for time|auf zeit|chipper|intervals?|skill|strength|kraft)\b/i.test(partText(part))
  );
  return [...(wodParts.length ? wodParts : activeParts)].at(-1) || parts.at(-1)!;
}

function detectFormat(text: string): WorkoutFormat | undefined {
  const patterns: Array<[WorkoutFormat, RegExp]> = [
    ['AMRAP', /\bamrap\b|so viele runden wie möglich/i],
    ['EMOM', /\bemom\b|jede minute(?: auf die minute)?/i],
    ['FOR TIME', /\bfor\s*time\b|auf\s*zeit|so schnell wie möglich/i],
    ['CHIPPER', /\bchipper\b|chipper workout/i],
    ['INTERVALS', /\bintervals?\b|\bintervalle?\b/i],
    ['SKILL', /\bskill\b|\btechnik\b/i],
    ['STRENGTH', /\bstrength\b|\bkraft\b/i],
  ];
  return patterns.find(([, pattern]) => pattern.test(text))?.[0];
}

function detectBenchmark(text: string): string | undefined {
  const benchmark = text.match(/\b(Fran|Grace|Helen|Diane|Isabel|Karen|Annie|Murph|Cindy|Jackie|Elizabeth|Nancy|DT|Open\s+\d{2}\.\d)\b/i);
  if (benchmark) return benchmark[1].replace(/\s+/g, ' ').toUpperCase();
  const quoted = text.match(/[“„"](.*?)[“”"]/);
  return quoted?.[1]?.trim().toUpperCase() || undefined;
}

export function getWorkoutFormat(workout: WorkoutFormatInput): WorkoutFormatDetails {
  const title = typeof workout?.title === 'string' ? workout.title : '';
  const description = typeof workout?.description === 'string' ? workout.description : '';
  const wodPart = getWorkoutWodPart({ title, description });
  const selectedText = partText(wodPart);
  const combinedText = `${title}\n${selectedText}`;
  const format = detectFormat(combinedText);
  const minutesMatch = selectedText.match(/(\d+)\s*(?:min(?:ute)?s?\b|′|')/i);
  const teamMatch = combinedText.match(/\bteam\s+of\s+(\d+)\b|\bteam\s+von\s+(\d+)\b/i);
  const benchmark = detectBenchmark(combinedText);
  return {
    ...(format ? { format } : {}),
    ...(minutesMatch ? { minutes: Number(minutesMatch[1]) } : {}),
    ...(teamMatch ? { team: `TEAM OF ${teamMatch[1] || teamMatch[2]}` } : {}),
    ...(benchmark ? { benchmark } : {}),
  };
}

export function getWorkoutFormatStamps(workout: WorkoutFormatInput): WorkoutFormatStamp[] {
  const details = getWorkoutFormat(workout);
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
  if (details.team) stamps.push({ label: details.team, variant: 'meta' });
  if (details.benchmark) stamps.push({ label: details.benchmark, variant: 'benchmark' });
  return stamps;
}

export function getWorkoutScoreboard(workout: WorkoutFormatInput) {
  const part = getWorkoutWodPart(workout);
  const isRepScheme = (line: string) => {
    const normalized = line.replace(/\s+/g, '').replace(/[–—]/g, '-');
    return /^(?:\d+(?:[-/]\d+){1,}|\d+[x×]\d+|\d{2,3})$/i.test(normalized);
  };
  const schemeLine = [part.title, ...part.lines].find((line) =>
    isRepScheme(line)
  );
  const scheme = schemeLine?.replace(/\s+/g, '').replace(/[×]/g, 'x').replace(/[–—]/g, '-');
  const movements = part.movements
    .filter((movement) => !isRepScheme(`${movement.reps || ''}${movement.movement}`))
    .map((movement) => movement.movement)
    .filter(Boolean)
    .slice(0, 4);
  return scheme ? { scheme, movements } : null;
}
