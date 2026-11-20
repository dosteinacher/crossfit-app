/**
 * Guided-editor data model (v8).
 *
 * toModel/toText convert between the PURE notation stored in a workout's
 * `description` field and a structured model the Simple-mode UI edits.
 *
 * The one rule that matters more than any other: toText(toModel(text)) must
 * reproduce `text` exactly (ignoring only trailing whitespace) for every
 * workout that already exists, whether it uses PURE notation or free text.
 * To guarantee that without re-deriving every line from scratch, each part
 * header and each item keeps the exact original line ("raw") alongside its
 * parsed fields. toText prints `raw` verbatim whenever it is still present,
 * and only re-derives a line from the structured fields once something has
 * actually edited that part or item (dropping its `raw`). Phase 1 never
 * drops a `raw`, so every round trip here is exact by construction; Phase 2
 * is responsible for clearing `raw` on the fields it lets people edit.
 *
 * Workouts with no `#` header at all (plain free text, the format most
 * existing workouts use) are kept verbatim as `preamble` with `parts: []`.
 * Splitting that kind of text into parts is Phase 4's "Paste text" /
 * "Convert" action, done once, explicitly, as a user choice, not something
 * toModel does silently every time the workout is opened.
 */

import {
  parseTimerLine,
  serializeTimer,
  type IntervalTimer,
  type WorkoutWarning,
} from './workoutNotation';

export type Timer = IntervalTimer;

export type Item =
  | { kind: 'movement'; reps: string; name: string; load: string; alts: string[]; raw?: string; blankLinesBefore?: number }
  | { kind: 'section'; text: string; raw?: string; blankLinesBefore?: number }
  | { kind: 'note'; text: string; raw?: string; blankLinesBefore?: number }
  | { kind: 'text'; text: string; raw?: string; blankLinesBefore?: number };

export type PartFormat =
  | 'AMRAP'
  | 'EMOM'
  | 'For Time'
  | 'Rounds'
  | 'Intervals'
  | 'Strength'
  | 'Skill'
  | 'Other';

export type TimerMode = 'countup' | 'countdown' | 'intervals';

/** A body line extracted out of `items` because Simple mode shows it in its own field. */
interface Extra {
  kind: 'timer' | 'rounds';
  /** Exact original line text. Absent only for a line created by an edit (Phase 2). */
  raw?: string;
  /** How many real items (in `items`) came before this line in the source. */
  index: number;
  /** How many blank lines preceded this one in the source. */
  blankLinesBefore?: number;
}

export interface Part {
  title: string;
  minutes: string;
  format: PartFormat;
  /** The format name as typed, when `format` is 'Other' (e.g. "Chipper", "Death by"). */
  otherName?: string;
  /** Timer mode for the 'Other' format: countup / countdown / intervals. */
  timerMode?: TimerMode;
  team: string;
  /** Round count for the 'Rounds' format, e.g. "5". */
  rounds?: string;
  /** Plain description line(s) directly under the title, before any item. */
  instructions: string[];
  /** Set when timerMode is 'intervals' (or a bare interval timer line was found). */
  timer?: Timer;
  items: Item[];
  /** Exact original `# ...` header line. Absent for a part created in Simple mode. */
  headerRaw?: string;
  /** Header segments that aren't minutes/format/team, kept so nothing is lost. */
  meta?: string[];
  /** Internal: timer / rounds lines pulled out of `items`, with their original position. */
  extras?: Extra[];
  /** Blank lines between the previous part and this one's header (default 1, the canonical gap, when unset — e.g. a part added in Simple mode). Unused for the first part. */
  blankLinesBefore?: number;
}

export interface WorkoutModel {
  parts: Part[];
  /** Lines before the first `#` header, or the whole text when there is no header at all. */
  preamble: string[];
}

/** The known format pill names (Phase 2). Anything else becomes 'Other'. */
function matchKnownFormat(value: string): PartFormat | undefined {
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'amrap':
      return 'AMRAP';
    case 'emom':
      return 'EMOM';
    case 'for time':
    case 'fortime':
      return 'For Time';
    case 'rounds':
      return 'Rounds';
    case 'intervals':
    case 'interval':
      return 'Intervals';
    case 'strength':
      return 'Strength';
    case 'skill':
      return 'Skill';
    default:
      return undefined;
  }
}

function parseMinutesSegment(value: string): string | undefined {
  const match = value.trim().match(/^(\d+)\s*(?:min(?:ute)?s?\b|′|')?$/i);
  return match ? match[1] : undefined;
}

const TEAM_PATTERN = /^team(?:s)?\s+(?:of|von)\s+\d+\b/i;
const ROUNDS_SCHEME = /^(\d+)\s+(?:rounds?|runden?)\b/i;
const BARE_SCHEME = /^\d+(?:[-–—]\d+)+$|^\d+[x×]\d+$/;
const LEAD_REPS =
  /^(\d+(?:\s*[-–—]\s*\d+)+|\d+\s*[x×]\s*\d+|\d+:\d{2}|\d+(?:[.,]\d+)?\s*(?:m|km|cal)\b|\d+|max)\s+(.+)$/i;

function stripTrailing(value: string) {
  return value.replace(/[ \t]+$/g, '');
}

/** Depth-aware split on the first top-level '/', e.g. "24/16 kg" is not an alternative split. */
function splitAlternative(value: string): { movement: string; alt?: string } {
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
    ? { movement: value.trim() }
    : { movement: value.slice(0, separator).trim(), alt: value.slice(separator + 1).trim() || undefined };
}

function parseMovementLine(value: string): { reps: string; name: string; load: string; alts: string[] } {
  const match = value.match(LEAD_REPS);
  const reps = match ? match[1].replace(/\s+/g, ' ').trim() : '';
  const rest = match ? match[2] : value;

  const { movement, alt } = splitAlternative(rest);
  let name = movement;
  let load = '';

  const atLoad = name.match(/\s+@\s*(.+)$/);
  if (atLoad) {
    load = atLoad[1].trim();
    name = name.slice(0, atLoad.index).trim();
  }

  const alts = alt
    ? alt.split('·').map((entry) => entry.trim()).filter(Boolean)
    : [];

  return { reps, name: name || rest.trim(), load, alts };
}

function parseHeaderLine(line: string): Omit<Part, 'items' | 'instructions' | 'extras'> {
  const value = line.replace(/^#\s*/, '');
  const segments = value.split('|').map((segment) => segment.trim());
  const title = segments.shift() || 'Workout';

  const part: Omit<Part, 'items' | 'instructions' | 'extras'> = {
    title,
    minutes: '',
    format: 'Other',
    team: '',
    headerRaw: stripTrailing(line),
  };
  let formatSet = false;
  const meta: string[] = [];

  for (const segment of segments) {
    if (!segment) continue;
    const minutes = parseMinutesSegment(segment);
    if (minutes !== undefined && !part.minutes) {
      part.minutes = minutes;
      continue;
    }
    const known = matchKnownFormat(segment);
    if (known && !formatSet) {
      part.format = known;
      formatSet = true;
      continue;
    }
    if (TEAM_PATTERN.test(segment) && !part.team) {
      part.team = segment;
      continue;
    }
    if (!formatSet) {
      part.format = 'Other';
      part.otherName = segment;
      formatSet = true;
      continue;
    }
    meta.push(segment);
  }
  if (meta.length) part.meta = meta;
  return part;
}

function classifyLine(line: string, blankLinesBefore: number): Item {
  const value = line.trim();
  const flag = blankLinesBefore ? { blankLinesBefore } : {};
  if (/^##\s+/.test(value)) {
    return { kind: 'section', text: value.replace(/^##\s+/, '').trim(), raw: stripTrailing(line), ...flag };
  }
  if (/^!\s*/.test(value)) {
    return { kind: 'note', text: value.replace(/^!\s*/, '').trim(), raw: stripTrailing(line), ...flag };
  }
  if (/^-\s+/.test(value)) {
    return { kind: 'text', text: value.replace(/^-\s+/, '').trim(), raw: stripTrailing(line), ...flag };
  }
  const movement = parseMovementLine(value);
  if (movement.reps) {
    return { kind: 'movement', ...movement, raw: stripTrailing(line), ...flag };
  }
  return { kind: 'text', text: value, raw: stripTrailing(line), ...flag };
}

export function toModel(text: string): WorkoutModel {
  try {
    if (typeof text !== 'string' || !text.trim()) return { parts: [], preamble: [] };

    const lines = text.split(/\r?\n/);
    const hasHeader = lines.some((line) => /^#(?!#)\s*/.test(line.trim()));
    if (!hasHeader) return { parts: [], preamble: [...lines] };

    const preamble: string[] = [];
    const parts: Part[] = [];
    let current: Part | undefined;
    let instructionsOpen = false;
    // Counts consecutive blank source lines, consumed (and reset) by whatever real
    // content follows them, so that content can record "N blank lines preceded me".
    let pendingBlankLines = 0;

    for (const raw of lines) {
      const value = raw.trim();
      if (!value) {
        pendingBlankLines += 1;
        continue;
      }

      if (/^#(?!#)\s*/.test(value)) {
        const header = parseHeaderLine(raw.trim());
        // Blank lines right before a new part are this part's own gap from the
        // previous one (toText defaults to one when unset, for a part added in
        // Simple mode); real workouts sometimes use two, not always one.
        current = { ...header, instructions: [], items: [], extras: [], blankLinesBefore: pendingBlankLines };
        parts.push(current);
        instructionsOpen = true;
        pendingBlankLines = 0;
        continue;
      }

      if (!current) {
        preamble.push(stripTrailing(raw));
        continue;
      }

      const timerWord = value.replace(/^~\s*/, '').trim().toLowerCase();
      if (/^~/.test(value) && timerWord === 'countdown') {
        current.timerMode = 'countdown';
        (current.extras ||= []).push({ kind: 'timer', raw: stripTrailing(raw), index: current.items.length, blankLinesBefore: pendingBlankLines });
        pendingBlankLines = 0;
        instructionsOpen = false;
        continue;
      }
      if (/^~/.test(value) && timerWord === 'count up') {
        current.timerMode = 'countup';
        (current.extras ||= []).push({ kind: 'timer', raw: stripTrailing(raw), index: current.items.length, blankLinesBefore: pendingBlankLines });
        pendingBlankLines = 0;
        instructionsOpen = false;
        continue;
      }
      if (/^~/.test(value)) {
        const warnings: WorkoutWarning[] = [];
        const timer = parseTimerLine(value, 0, warnings);
        if (timer) {
          current.timer = timer;
          current.timerMode = 'intervals';
        }
        (current.extras ||= []).push({ kind: 'timer', raw: stripTrailing(raw), index: current.items.length, blankLinesBefore: pendingBlankLines });
        pendingBlankLines = 0;
        instructionsOpen = false;
        continue;
      }

      const roundsMatch = value.match(ROUNDS_SCHEME);
      if (roundsMatch) {
        current.rounds = roundsMatch[1];
        (current.extras ||= []).push({ kind: 'rounds', raw: stripTrailing(raw), index: current.items.length, blankLinesBefore: pendingBlankLines });
        pendingBlankLines = 0;
        // A rounds/timer line is real content, like an item: anything after it is no
        // longer "the leading instructions paragraph", even if nothing has gone into
        // `instructions` yet - otherwise a later instruction-like line would render
        // before this one, reordering the part (seen in real data: a rounds line
        // followed by a `>` explanation that must stay after it).
        instructionsOpen = false;
        continue;
      }

      const isPrefixed = /^(##\s+|!\s*|-\s+)/.test(value);
      // A bare rep/round scheme ("21-15-9", "5x5") is workout content, not prose,
      // even though it has no following movement name for LEAD_REPS to capture.
      const isBareScheme = BARE_SCHEME.test(value.replace(/\s+/g, ''));
      if (instructionsOpen && !isPrefixed && !isBareScheme) {
        const movement = parseMovementLine(value);
        if (!movement.reps) {
          current.instructions.push(value);
          pendingBlankLines = 0;
          continue;
        }
      }
      instructionsOpen = false;
      current.items.push(classifyLine(raw, pendingBlankLines));
      pendingBlankLines = 0;
    }

    return { parts, preamble };
  } catch {
    return { parts: [], preamble: [] };
  }
}

function itemToLine(item: Item): string {
  if (item.raw !== undefined) return item.raw;
  switch (item.kind) {
    case 'section':
      return `## ${item.text}`;
    case 'note':
      return `! ${item.text}`;
    case 'text':
      return `- ${item.text}`;
    case 'movement': {
      const altSuffix = item.alts.length ? ` / ${item.alts.join(' · ')}` : '';
      const loadSuffix = item.load ? ` @ ${item.load}` : '';
      const reps = item.reps ? `${item.reps} ` : '';
      return `${reps}${item.name}${loadSuffix}${altSuffix}`;
    }
  }
}

function deriveExtraLine(extra: Extra, part: Part): string {
  if (extra.kind === 'rounds') return `${part.rounds ?? ''} Rounds`;
  if (part.timerMode === 'countdown') return '~ Countdown';
  if (part.timerMode === 'countup') return '~ Count up';
  if (part.timer) return serializeTimer(part.timer);
  return '~';
}

function renderHeaderLine(part: Part): string {
  if (part.headerRaw !== undefined) return part.headerRaw;
  const segments = [
    part.minutes || '',
    part.format === 'Other' ? part.otherName || '' : part.format,
    part.team || '',
    ...(part.meta || []),
  ].filter(Boolean);
  return `# ${part.title}${segments.map((segment) => ` | ${segment}`).join('')}`;
}

interface RenderedLine {
  text: string;
  blankLinesBefore?: number;
}

function renderPart(part: Part): string {
  const lines: RenderedLine[] = part.items.map((item) => ({ text: itemToLine(item), blankLinesBefore: item.blankLinesBefore }));
  // Descending by index, so each splice lands at its recorded position without
  // shifting extras not yet processed. Extras that share an index (two "~"
  // lines back to back, say) must splice in reverse of their original order,
  // so the first-seen one ends up first after both insertions.
  const extras = (part.extras || [])
    .map((extra, position) => ({ extra, position }))
    .sort((left, right) => right.extra.index - left.extra.index || right.position - left.position)
    .map(({ extra }) => extra);
  for (const extra of extras) {
    const text = extra.raw !== undefined ? extra.raw : deriveExtraLine(extra, part);
    const position = Math.max(0, Math.min(extra.index, lines.length));
    lines.splice(position, 0, { text, blankLinesBefore: extra.blankLinesBefore });
  }
  const bodyLines = lines.flatMap((line) =>
    line.blankLinesBefore ? [...Array(line.blankLinesBefore).fill(''), line.text] : [line.text]
  );
  return [renderHeaderLine(part), ...part.instructions, ...bodyLines].join('\n');
}

export function toText(model: WorkoutModel): string {
  if (!model || typeof model !== 'object') return '';
  const parts = model.parts || [];
  const body = parts
    .map((part, index) => {
      const rendered = renderPart(part);
      if (index === 0) return rendered;
      const blankLines = part.blankLinesBefore ?? 1;
      return '\n'.repeat(blankLines + 1) + rendered;
    })
    .join('');
  const preamble = model.preamble || [];
  if (!preamble.length) return body;
  return body ? [preamble.join('\n'), body].join('\n\n') : preamble.join('\n');
}
