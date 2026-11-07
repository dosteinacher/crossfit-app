export type WorkoutBlockType = 'section' | 'sub' | 'note' | 'scheme' | 'movement' | 'text';

export interface WorkoutBlock {
  type: WorkoutBlockType;
  reps?: string;
  name: string;
  load?: string;
  alt?: string;
  line: number;
}

export interface WorkoutPart {
  title: string;
  minutes?: number;
  format?: 'AMRAP' | 'EMOM' | 'FOR TIME' | 'CHIPPER' | 'INTERVALS' | 'SKILL' | 'STRENGTH';
  team?: string;
  meta: string[];
  blocks: WorkoutBlock[];
}

export interface WorkoutWarning {
  line: number;
  message: string;
}

export interface ParsedWorkout {
  parts: WorkoutPart[];
  warnings: WorkoutWarning[];
}

interface SourceLine {
  text: string;
  line: number;
}

const FORMAT_PATTERNS: Array<[WorkoutPart['format'], RegExp]> = [
  ['AMRAP', /\bamrap\b|so viele runden wie möglich/i],
  ['EMOM', /\bemom\b|jede minute(?: auf die minute)?/i],
  ['FOR TIME', /\bfor\s*time\b|auf\s*zeit|so schnell wie möglich/i],
  ['CHIPPER', /\bchipper\b/i],
  ['INTERVALS', /\bintervals?\b|\bintervalle?\b/i],
  ['SKILL', /\bskill\b|\btechnik\b/i],
  ['STRENGTH', /\bstrength\b|\bkraft\b/i],
];

const LEGACY_PART_TITLE = /^(?:warm[\s-]?up|aufwärmen|strength|skill|wod|workout|finisher|cool[\s-]?down)\b/i;
const REP_SCHEME = /^\d+(?:(?:\s*[-–—]\s*\d+)+|(?:\s*[x×]\s*\d+))?$/;
const REP_PREFIX = /^(\d+(?:(?:\s*[-–—]\s*\d+)+|(?:\s*[x×]\s*\d+))?|\d+:\d{2}|\d+(?:[.,]\d+)?\s*(?:m|km))\s+(.+)$/i;
const ROUNDS_SCHEME = /^\d+\s+(?:rounds?|runden?)\b/i;
const EMOM_SCHEME = /^emom\s+\d+\b/i;

function cleanTitle(value: string) {
  return value.trim().replace(/^[«„“"]|[»“”"]$/g, '').trim() || 'Workout';
}

export function detectWorkoutFormat(value: string): WorkoutPart['format'] | undefined {
  return FORMAT_PATTERNS.find(([, pattern]) => pattern.test(value))?.[0];
}

function parseMinutes(value: string) {
  const match = value.match(/\b(\d+)\s*(?:min(?:ute)?s?\b|′|')/i);
  return match ? Number(match[1]) : undefined;
}

function parseHeaderSegments(title: string, segments: string[]): WorkoutPart {
  const part: WorkoutPart = { title: cleanTitle(title), meta: [], blocks: [] };
  for (const segment of segments) {
    const value = segment.trim();
    if (!value) continue;
    const minutes = /^\d+(?:\s*(?:min(?:ute)?s?|′|'))?$/i.test(value)
      ? Number(value.match(/^\d+/)?.[0])
      : parseMinutes(value);
    if (minutes && !part.minutes) {
      part.minutes = minutes;
      continue;
    }
    const format = detectWorkoutFormat(value);
    if (format && !part.format) {
      part.format = format;
      continue;
    }
    if (/^team\s+(?:of|von)\s+\d+\b/i.test(value)) {
      part.team = value;
      continue;
    }
    part.meta.push(value);
  }
  return part;
}

function splitAlternative(value: string) {
  let depth = 0;
  let separator = -1;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '(') depth += 1;
    else if (character === ')') depth = Math.max(0, depth - 1);
    else if (
      character === '/' &&
      depth === 0 &&
      !(/\d/.test(value[index - 1] || '') && /\d/.test(value[index + 1] || ''))
    ) {
      separator = index;
    }
  }
  return separator < 0
    ? { movement: value.trim(), alt: undefined }
    : {
        movement: value.slice(0, separator).trim(),
        alt: value.slice(separator + 1).trim() || undefined,
      };
}

function parseMovement(value: string, line: number): WorkoutBlock | null {
  const match = value.match(REP_PREFIX);
  if (!match) return null;

  const reps = match[1].replace(/\s+/g, '').replace(/[–—]/g, '-');
  const { movement: initialMovement, alt } = splitAlternative(match[2]);
  let name = initialMovement;
  let load: string | undefined;

  const atLoad = name.match(/\s+@\s*(.+)$/);
  if (atLoad) {
    load = atLoad[1].trim();
    name = name.slice(0, atLoad.index).trim();
  } else {
    const parentheticalLoad = name.match(
      /\s+\((\d+(?:[.,]\d+)?(?:\s*[x×]\s*\d+(?:[.,]\d+)?)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?(?:\s*(?:kg|kgs|lb|lbs|#))?)\)\s*$/i
    );
    if (parentheticalLoad) {
      load = parentheticalLoad[1].trim();
      name = name.slice(0, parentheticalLoad.index).trim();
    }
  }

  return {
    type: 'movement',
    reps,
    name: name || initialMovement,
    ...(load ? { load } : {}),
    ...(alt ? { alt } : {}),
    line,
  };
}

function parseContentLine(source: SourceLine, warnings: WorkoutWarning[], legacyMovementContext = false): WorkoutBlock {
  const value = source.text.trim();
  if (/^##\s+/.test(value)) {
    return { type: 'section', name: value.replace(/^##\s+/, '').trim(), line: source.line };
  }
  if (/^>\s*/.test(value)) {
    return { type: 'sub', name: value.replace(/^>\s*/, '').trim(), line: source.line };
  }
  if (/^!\s*/.test(value)) {
    return { type: 'note', name: value.replace(/^!\s*/, '').trim(), line: source.line };
  }
  if (ROUNDS_SCHEME.test(value) || EMOM_SCHEME.test(value)) {
    return { type: 'scheme', name: value, line: source.line };
  }
  if (REP_SCHEME.test(value.replace(/\s+/g, ''))) {
    return { type: 'scheme', name: value, line: source.line };
  }
  if (/^(?:BUY-IN|THEN|BUY-OUT)$/i.test(value) || /:\s*$/.test(value)) {
    return { type: 'section', name: value.replace(/:\s*$/, '').trim(), line: source.line };
  }
  const movement = parseMovement(value, source.line);
  if (movement) return movement;
  if (
    legacyMovementContext &&
    !/[.!?:;]$/.test(value) &&
    !/^(?:switch|build|rest|focus|split|note|classic|when|nach|if|then|team)\b/i.test(value)
  ) {
    const legacyMovement = parseMovement(`1 ${value}`, source.line);
    if (legacyMovement) {
      const { name, load, alt } = legacyMovement;
      return {
        type: 'movement',
        name,
        ...(load ? { load } : {}),
        ...(alt ? { alt } : {}),
        line: source.line,
      };
    }
  }

  warnings.push({
    line: source.line,
    message: 'No reps found. Shown as a text line.',
  });
  return { type: 'text', name: value, line: source.line };
}

function splitInlineLines(value: string, line: number): SourceLine[] {
  return value
    .split(/\s+-\s+/)
    .map((text) => ({ text: text.trim(), line }))
    .filter((entry) => entry.text.length > 0);
}

function legacyHeader(value: string) {
  const withoutNumber = value.replace(/^\d+\.\s*/, '').trim();
  const match = withoutNumber.match(
    /^(.+?)(?:\s+[–—-]\s+|:\s*|\s+(?=\d+\s*min\b)|\s+(?=\b(?:amrap|emom|for\s+time|chipper|intervals?|skill|strength)\b))(.*)$/i
  );
  const title = match?.[1]?.trim() || withoutNumber;
  const details = match?.[2]?.trim() || '';
  return {
    title,
    details,
    format: detectWorkoutFormat(withoutNumber),
    minutes: parseMinutes(withoutNumber),
  };
}

function looksLikeLegacyPart(value: string) {
  const withoutNumber = value.replace(/^\d+\.\s*/, '').trim();
  return /^\d+\.\s+/.test(value) || (
    LEGACY_PART_TITLE.test(withoutNumber) &&
    /^(?:warm[\s-]?up|aufwärmen|strength|skill|wod|workout|finisher|cool[\s-]?down)\b/i.test(withoutNumber)
  );
}

function splitLegacyParts(lines: SourceLine[]) {
  const expanded = lines.flatMap(({ text, line }) => {
    const splitPattern = /^\d+\.\s+/.test(text)
      ? /\s+(?=\d+\.\s+)/
      : /\s+(?=(?:warm[\s-]?up|aufwärmen|strength|skill|wod|workout|finisher|cool[\s-]?down)\b[^,\n]*?(?:[–—:]|\d+\s*min\b))/i;
    const splitPartHeaders = text.split(splitPattern);
    return splitPartHeaders.flatMap((part) => splitInlineLines(part, line));
  });

  const groups: SourceLine[][] = [];
  for (const source of expanded) {
    if (looksLikeLegacyPart(source.text)) groups.push([source]);
    else if (groups.length) groups[groups.length - 1].push(source);
    else groups.push([source]);
  }

  if (groups.length <= 1) return groups;
  const hasPartHeading = groups.some((group) => looksLikeLegacyPart(group[0]?.text || ''));
  if (!hasPartHeading) return [groups.flat()];
  return groups;
}

function parseLegacyGroup(group: SourceLine[], warnings: WorkoutWarning[]): WorkoutPart {
  const first = group[0]?.text || '';
  const leadingSection = /^(?:BUY-IN|THEN|BUY-OUT):?$/i.test(first);
  const leadingScheme = /^(?:\d+\s+(?:rounds?|runden?)|emom\s+\d+|\d+(?:[-–—]\d+)+|\d+[x×]\d+):?$/i.test(first);
  const header = leadingSection
    ? { title: 'Workout', details: '', format: undefined, minutes: undefined }
    : legacyHeader(first);
  const teamOnlyHeader = /^team(?:s)?\s+(?:of|von)\s+\d+\b/i.test(first);
  const part = parseHeaderSegments(header.title, [
    ...(header.minutes ? [`${header.minutes} min`] : []),
    ...(header.format ? [header.format] : []),
  ]);
  if (teamOnlyHeader) {
    part.title = 'Workout';
    part.meta.push(first);
  }
  if (header.format) part.format = header.format;
  const firstDetails = header.details
    .split(/\s+-\s+/)
    .map((text) => text.replace(/\b\d+\s*min(?:ute)?s?\b/ig, '').trim())
    .filter((text) => text.length > 0 && text.toUpperCase() !== part.format);
  const body = [
    ...(leadingSection ? [first] : []),
    ...(leadingScheme ? [first] : []),
    ...firstDetails,
    ...(teamOnlyHeader ? [] : group.slice(1).map((source) => source.text)),
  ];

  let hasRepScheme = false;
  for (const text of body) {
    if (/^team\s+(?:of|von)\s+\d+\b/i.test(text)) {
      part.meta.push(text);
      continue;
    }
    const format = detectWorkoutFormat(text);
    if (format && !part.format && /^(?:amrap|emom|for\s*time|chipper|intervals?|skill|strength)\b/i.test(text)) {
      part.format = format;
      const minutes = parseMinutes(text);
      if (minutes && !part.minutes) part.minutes = minutes;
      if (/:\s*$/.test(text)) continue;
    }
    const source = group.find((entry) => entry.text === text) || group[0];
    for (const entry of splitInlineLines(text, source.line)) {
      const block = parseContentLine(entry, warnings, hasRepScheme);
      part.blocks.push(block);
      if (block.type === 'scheme' && REP_SCHEME.test(block.name.replace(/\s+/g, ''))) {
        hasRepScheme = true;
      }
    }
  }
  return part;
}

function parseExplicit(lines: SourceLine[], warnings: WorkoutWarning[]): WorkoutPart[] {
  const parts: WorkoutPart[] = [];
  let current: WorkoutPart | undefined;
  for (const source of lines) {
    const value = source.text.trim();
    if (!value) continue;
    if (/^#(?!#)\s*/.test(value)) {
      const segments = value.replace(/^#\s*/, '').split('|');
      current = parseHeaderSegments(segments.shift() || '', segments);
      parts.push(current);
      continue;
    }
    if (!current) {
      current = { title: 'Workout', meta: [], blocks: [] };
      parts.push(current);
    }
    if (/^team(?:s)?\s+(?:of|von)\s+\d+\b/i.test(value)) {
      current.meta.push(value);
      continue;
    }
    current.blocks.push(parseContentLine(source, warnings));
  }
  return parts;
}

export function parseWorkout(text: string): ParsedWorkout {
  const result: ParsedWorkout = { parts: [], warnings: [] };
  try {
    if (typeof text !== 'string' || !text.trim()) return result;
    const lines: SourceLine[] = text
      .split(/\r?\n/)
      .map((value, index) => ({ text: value.trim(), line: index + 1 }))
      .filter((source) => source.text.length > 0);
    const hasNotationHeader = lines.some((source) => /^#(?!#)\s*/.test(source.text));
    result.parts = hasNotationHeader
      ? parseExplicit(lines, result.warnings)
      : splitLegacyParts(lines).map((group) => parseLegacyGroup(group, result.warnings));
    return result;
  } catch {
    return { parts: [], warnings: [] };
  }
}
