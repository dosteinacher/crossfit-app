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
  format?: 'AMRAP' | 'EMOM' | 'FOR TIME' | 'CHIPPER' | 'INTERVALS' | 'TABATA' | 'SKILL' | 'STRENGTH';
  team?: string;
  timer?: IntervalTimer;
  meta: string[];
  blocks: WorkoutBlock[];
}

export interface IntervalTimer {
  rounds: number;
  work: number;
  rest: number;
  sets: number;
  setRest: number;
  prep: number;
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
  ['TABATA', /\btabata\b/i],
  ['SKILL', /\bskill\b|\btechnik\b/i],
  ['STRENGTH', /\bstrength\b|\bkraft\b/i],
];

const LEGACY_PART_TITLE = /^(?:warm[\s-]?up|aufwärmen|strength|skill|wod|workout|finisher|cool[\s-]?down)\b/i;
const REP_SCHEME = /^\d+(?:(?:\s*[-–—]\s*\d+)+|(?:\s*[x×]\s*\d+))?$/;
const REP_PREFIX = /^(\d+(?:(?:\s*[-–—]\s*\d+)+|(?:\s*[x×]\s*\d+))?|\d+:\d{2}|\d+(?:[.,]\d+)?\s*(?:m|km))\s+(.+)$/i;
const ROUNDS_SCHEME = /^\d+\s+(?:rounds?|runden?)\b/i;
const EMOM_SCHEME = /^emom\s+\d+\b/i;
const TABATA_TIMER: IntervalTimer = { rounds: 8, work: 20, rest: 10, sets: 1, setRest: 60, prep: 10 };
const TIMER_DEFAULTS = { sets: 1, setRest: 60, prep: 10 };

function parseTimerDuration(value: string) {
  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  const match = normalized.match(/^(\d+):(\d{2})$/);
  if (!match || Number(match[2]) > 59) return undefined;
  return Number(match[1]) * 60 + Number(match[2]);
}

function clampTimerValue(
  key: keyof IntervalTimer,
  value: number,
  line: number,
  warnings: WorkoutWarning[],
) {
  const limits: Record<keyof IntervalTimer, [number, number]> = {
    rounds: [1, 50],
    work: [5, 600],
    rest: [0, 300],
    sets: [1, 10],
    setRest: [0, 600],
    prep: [0, 30],
  };
  const [minimum, maximum] = limits[key];
  const clamped = Math.max(minimum, Math.min(maximum, value));
  if (clamped !== value) {
    warnings.push({
      line,
      message: `Timer ${key} was clamped to ${clamped}.`,
    });
  }
  return clamped;
}

function parseTimerLine(value: string, line: number, warnings: WorkoutWarning[]): IntervalTimer | undefined {
  const segments = value.replace(/^~\s*/, '').split('|').map((segment) => segment.trim());
  const expression = segments.shift() || '';
  let rounds: number | undefined;
  let work: number | undefined;
  let rest: number | undefined;
  const preset = expression.match(/^tabata$/i);
  const hiit = expression.match(/^hiit\s+(\d+)\s*\/\s*(\d+)$/i);
  const emom = expression.match(/^emom\s+(\d+)$/i);
  const interval = expression.match(/^(\d+)\s*[x×]\s*(\d+(?::\d{2})?)\s*\/\s*(\d+(?::\d{2})?)$/i);

  if (preset) {
    ({ rounds, work, rest } = TABATA_TIMER);
  } else if (hiit) {
    rounds = 10;
    work = Number(hiit[1]);
    rest = Number(hiit[2]);
  } else if (emom) {
    rounds = Number(emom[1]);
    work = 60;
    rest = 0;
  } else if (interval) {
    rounds = Number(interval[1]);
    work = parseTimerDuration(interval[2]);
    rest = parseTimerDuration(interval[3]);
  } else {
    warnings.push({ line, message: 'Unrecognized interval timer line. The timer was not set.' });
    return undefined;
  }

  if (rounds === undefined || work === undefined || rest === undefined) {
    warnings.push({ line, message: 'Invalid interval timer duration. The timer was not set.' });
    return undefined;
  }

  const timer: IntervalTimer = {
    rounds: clampTimerValue('rounds', rounds, line, warnings),
    work: clampTimerValue('work', work, line, warnings),
    rest: clampTimerValue('rest', rest, line, warnings),
    ...TIMER_DEFAULTS,
  };

  for (const option of segments) {
    let match = option.match(/^(\d+)\s+sets?$/i);
    if (match) {
      timer.sets = clampTimerValue('sets', Number(match[1]), line, warnings);
      continue;
    }
    match = option.match(/^set\s+rest\s+(.+)$/i);
    if (match) {
      const duration = parseTimerDuration(match[1]);
      if (duration === undefined) {
        warnings.push({ line, message: 'Invalid set rest duration. The default was used.' });
      } else {
        timer.setRest = clampTimerValue('setRest', duration, line, warnings);
      }
      continue;
    }
    match = option.match(/^prep\s+(.+)$/i);
    if (match) {
      if (/^off$/i.test(match[1])) {
        timer.prep = 0;
      } else {
        const duration = parseTimerDuration(match[1]);
        if (duration === undefined) {
          warnings.push({ line, message: 'Invalid prep duration. The default was used.' });
        } else {
          timer.prep = clampTimerValue('prep', duration, line, warnings);
        }
      }
      continue;
    }
    warnings.push({ line, message: `Unrecognized timer option: ${option}.` });
  }

  return timer;
}

function formatTimerDuration(seconds: number) {
  return seconds < 60
    ? String(seconds)
    : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function serializeTimer(timer: IntervalTimer) {
  const preset = timer.rounds === 8 && timer.work === 20 && timer.rest === 10
    ? 'Tabata'
    : timer.rounds === 10 && timer.work === 40 && timer.rest === 20
      ? 'HIIT 40/20'
      : timer.rounds === 10 && timer.work === 30 && timer.rest === 30
        ? 'HIIT 30/30'
        : timer.work === 60 && timer.rest === 0
          ? `EMOM ${timer.rounds}`
          : `${timer.rounds} x ${formatTimerDuration(timer.work)}/${formatTimerDuration(timer.rest)}`;
  const options = [
    timer.sets !== TIMER_DEFAULTS.sets ? `${timer.sets} sets` : '',
    timer.setRest !== TIMER_DEFAULTS.setRest ? `set rest ${formatTimerDuration(timer.setRest)}` : '',
    timer.prep !== TIMER_DEFAULTS.prep ? `prep ${timer.prep === 0 ? 'off' : formatTimerDuration(timer.prep)}` : '',
  ].filter(Boolean);
  return `~ ${[preset, ...options].join(' | ')}`;
}

function cleanTitle(value: string) {
  return value
    .trim()
    .replace(/#\s*NAME\b/gi, '')
    .replace(/\s*\|+\s*$/, '')
    .replace(/^warm\s+u\b/i, 'Warm-up')
    .trim() || 'Workout';
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
  const value = source.text.trim()
    .replace(/^(?:[-*•]\s+)/, '')
    .replace(/\s+#\s*NAME\b/gi, '')
    .replace(/\s*#+\s*$/, '')
    .replace(/\s*\|+\s*$/, '')
    .replace(/\s+of\s*$/i, '')
    .trim();
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
  const partLines: number[] = [];
  const timerLineSeen: boolean[] = [];
  let current: WorkoutPart | undefined;
  for (const source of lines) {
    const value = source.text.trim();
    if (!value) continue;
    if (/^#(?!#)\s*/.test(value)) {
      const segments = value.replace(/^#\s*/, '').split('|');
      current = parseHeaderSegments(segments.shift() || '', segments);
      parts.push(current);
      partLines.push(source.line);
      timerLineSeen.push(false);
      if (!current.minutes) {
        warnings.push({
          line: source.line,
          message: `Part ${parts.length} has no minutes. The timer will count up.`,
        });
      }
      continue;
    }
    if (!current) {
      current = { title: 'Workout', meta: [], blocks: [] };
      parts.push(current);
      partLines.push(source.line);
      timerLineSeen.push(false);
    }
    if (/^~/.test(value)) {
      const currentIndex = parts.length - 1;
      if (timerLineSeen[currentIndex]) {
        warnings.push({
          line: source.line,
          message: `Part ${parts.length} has more than one timer line (~); only the first is used.`,
        });
      } else {
        timerLineSeen[currentIndex] = true;
        current.timer = parseTimerLine(value, source.line, warnings);
      }
      continue;
    }
    if (/^team(?:s)?\s+(?:of|von)\s+\d+\b/i.test(value)) {
      current.meta.push(value);
      continue;
    }
    current.blocks.push(parseContentLine(source, warnings));
  }
  parts.forEach((part, index) => {
    if (part.format === 'TABATA' && !timerLineSeen[index]) {
      part.timer = { ...TABATA_TIMER };
    } else if (part.format === 'INTERVALS' && !timerLineSeen[index]) {
      warnings.push({
        line: partLines[index] || 1,
        message: `Part ${index + 1} is 'Intervals' but has no timer line (~). The timer will count up.`,
      });
    }
  });
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
    if (hasNotationHeader) {
      result.parts = parseExplicit(lines, result.warnings);
    } else {
      const groups = splitLegacyParts(lines);
      result.parts = groups.map((group, index) => {
        const part = parseLegacyGroup(group, result.warnings);
        if (!part.minutes && group[0]) {
          result.warnings.push({
            line: group[0].line,
            message: `Part ${index + 1} has no minutes. The timer will count up.`,
          });
        }
        return part;
      });
    }
    result.warnings.sort((left, right) => left.line - right.line);
    return result;
  } catch {
    return { parts: [], warnings: [] };
  }
}

export function getMainWorkoutFormat(text: string) {
  const { parts } = parseWorkout(text);
  const activeParts = parts.filter((part) =>
    !/warm[\s-]?up|aufwärmen|cool[\s-]?down|abkühlen/i.test(part.title)
  );
  const mainPart = activeParts.at(-1) || parts.at(-1);
  if (!mainPart) return undefined;
  return mainPart.format || detectWorkoutFormat([
    mainPart.title,
    ...mainPart.meta,
    ...mainPart.blocks.map((block) => block.name),
  ].join('\n'));
}

export function convertLegacyWorkoutToNotation(text: string) {
  const { parts } = parseWorkout(text);
  return parts.map((part) => {
    const segments = [
      part.minutes ? String(part.minutes) : '',
      part.format || '',
      part.team || '',
      ...part.meta,
    ].filter(Boolean);
    const header = `# ${part.title}${segments.map((segment) => ` | ${segment}`).join('')}`;
    const body = part.blocks.map((block) => {
      switch (block.type) {
        case 'section':
          return `## ${block.name}`;
        case 'sub':
          return `> ${block.name}`;
        case 'note':
          return `! ${block.name}`;
        case 'movement':
          return `${block.reps ? `${block.reps} ` : ''}${block.name}${block.load ? ` @ ${block.load}` : ''}${block.alt ? ` / ${block.alt}` : ''}`;
        default:
          return block.name;
      }
    });
    return [header, ...body].join('\n');
  }).join('\n\n');
}
