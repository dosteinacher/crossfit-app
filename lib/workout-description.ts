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

export function getWorkoutFormatStamps(description: string): string[] {
  const stamps: string[] = [];
  const addStamp = (stamp: string) => {
    if (!stamps.includes(stamp)) stamps.push(stamp);
  };
  const source = typeof description === 'string' ? description : '';
  const formatPatterns = [
    { pattern: /\bAMRAP(?:\s+(\d+)\s*(?:minutes?|mins?|m)\b)?/i, label: 'AMRAP' },
    { pattern: /\bEMOM(?:\s+(\d+)\s*(?:minutes?|mins?|m)\b)?/i, label: 'EMOM' },
  ];

  for (const { pattern, label } of formatPatterns) {
    const match = source.match(pattern);
    if (match) addStamp(match[1] ? `${label} · ${match[1]} MIN` : label);
  }

  const forTime = source.match(/\bFor\s+Time\b(?:\s*\(([^)]*)\))?/i);
  if (forTime) {
    const cap = forTime[1]?.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i)?.[1];
    addStamp(cap ? `FOR TIME · ${cap} MIN CAP` : 'FOR TIME');
  }

  const rounds = source.match(/\b(\d+)\s+Rounds?\b/i);
  if (rounds) addStamp(`${rounds[1]} ROUNDS`);

  const repScheme = source.match(/(?:^|\n)\s*(\d+(?:\s*[-/]\s*\d+){1,})\s*(?:\r?\n|$)/);
  if (repScheme) addStamp(repScheme[1].replace(/\s+/g, ''));

  if (stamps.length === 0) {
    for (const part of parseWorkoutDescription(source)) {
      if (part.sectionTitle !== 'Workout') {
        addStamp(part.durationMinutes
          ? `${part.sectionTitle.toUpperCase()} · ${part.durationMinutes} MIN`
          : part.sectionTitle.toUpperCase());
      }
    }
  }

  return stamps.slice(0, 3);
}
