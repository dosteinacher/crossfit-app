/**
 * v9 Phase 1 — lenient per-line classification for the "paste first, correct
 * second" Create-workout editor.
 *
 * Strict PURE notation (the `#`, `##`, `~`, `!`, `-`, `>` prefixes already
 * understood by lib/workoutNotation.ts) is tagged with confidence 'strict'.
 * Everything else is read leniently — this is what lets a coach paste a
 * Word doc, a WhatsApp message, or typed shorthand and get a sensible
 * reading, without the saved text ever being rewritten.
 *
 * This module only classifies; it never changes the text. Pair it with
 * cleanPastedText (lib/pasteCleanup.ts) for the one-time paste clean-up, and
 * with scripts/board-diff.ts to compare what it would change on the board
 * for real, already-saved workouts before anything is wired into production
 * rendering.
 */

import { parseContentLine, type WorkoutWarning } from './workoutNotation';

export type LineKind = 'part' | 'group' | 'timer' | 'move' | 'info' | 'note' | 'text' | 'check';
export type Confidence = 'strict' | 'lenient';

export interface PartParse {
  title: string;
  minutes?: number;
  format?: string;
  team?: string;
  rounds?: number;
}

export interface GroupParse {
  label?: string;
  title: string;
  format?: string;
}

export interface MoveParse {
  reps: string;
  name: string;
  load?: string;
  alts: string[];
}

export interface LineClassification {
  /** 1-based line number in the original text. */
  line: number;
  text: string;
  kind: LineKind;
  confidence: Confidence;
  parsed?: PartParse | GroupParse | MoveParse;
}

// Deliberately does NOT match a bare trailing number with no unit — only an
// explicit minutes marker counts (a bare number is too common in ordinary
// movement lines, like rep counts, to safely imply "this line is a part
// header"). The dash form ("Fresh Rotation – 30") is handled separately,
// by MINUTES_DASH, and only together with other part-header evidence.
const MINUTES_PATTERN = /(\d+)\s*(?:min(?:ute)?s?\b|minuten\b|′|')/i;
const MINUTES_DASH = /[–—-]\s*(\d+)\s*$/;
const PART_WORDS = /^(warm[\s-]?up|aufwärmen|strength|kraft|skill|wod|metcon|finisher|cool[\s-]?down|abkühlen|mobility)\b/i;
const FORMAT_WORDS: Array<[string, RegExp]> = [
  ['AMRAP', /\bamrap\b/i],
  ['EMOM', /\bemom\b/i],
  ['For Time', /\bfor\s*time\b/i],
  ['Chipper', /\bchipper\b/i],
  ['Tabata', /\btabata\b/i],
  ['Intervals', /\bintervals?\b|\bintervalle?\b/i],
];
const TEAM_OF = /\bteam\s*of\s*(\d+)\b|\b(\d+)er\s*team\b/i;
const TEAM_PAIRS_DE = /\bzu\s*zweit\b/i;
const TEAM_TRIPLE_DE = /\bzu\s*dritt\b/i;
const ROUNDS_WORD = /\b(\d+)\s*(?:rounds?|runden?)\b/i;

const GROUP_LABEL = /^(buy-?in|buy-?out|then)\s*:?$/i;
const NOTE_PREFIX = /^(?:note|hinweis|nb)\s*:\s*/i;
const TEXT_PREFIX_WORDS = /^(?:then|danach|rest|pause)\b[\s:]/i;
const BRACKET_ALT = /\(\s*(?:easier|scaled|alt|oder|leichter|or)\s*:?\s*([^)]+)\)/i;

// A load written without the strict '@' marker: "24/16kg", "70%", "60/50cm", "2×22.5/15 kg".
const LENIENT_LOAD = /\b(\d+(?:[.,]\d+)?(?:\s*[x×]\s*\d+(?:[.,]\d+)?)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*(?:kg|lbs?|%|cm|#))\b/i;

const MOVE_LEAD = /^(\d+(?:\s*[-–—]\s*\d+)+|\d+\s*[x×]\s*\d+|\d+:\d{2}|\d+(?:[.,]\d+)?\s*(?:m|km|cal)\b|\d+|max)\s+(.+)$/i;
// A bare rounds count ("2 Rounds", "4 Runden", "6 Rounds (each 3)") is a scheme
// line, not a movement named "Rounds" — matches lib/workoutNotation.ts's own
// ROUNDS_SCHEME exactly (no trailing anchor: a parenthetical remark after the
// count is still a scheme line, same as production).
const ROUNDS_SCHEME_LINE = /^\d+\s+(?:rounds?|runden?)\b/i;

function stripBracketAlt(value: string): { rest: string; alt?: string } {
  const match = value.match(BRACKET_ALT);
  if (!match) return { rest: value };
  return { rest: (value.slice(0, match.index) + value.slice((match.index || 0) + match[0].length)).trim(), alt: match[1].trim() };
}

function parseMoveLine(value: string): MoveParse | undefined {
  const match = value.match(MOVE_LEAD);
  if (!match) return undefined;
  const reps = match[1].replace(/\s+/g, ' ');
  let rest = match[2];

  const { rest: withoutBracket, alt: bracketAlt } = stripBracketAlt(rest);
  rest = withoutBracket;

  let slashAlt: string | undefined;
  const slashSplit = rest.split(/\s+\/\s+/);
  if (slashSplit.length > 1) {
    rest = slashSplit[0];
    slashAlt = slashSplit.slice(1).join(' / ');
  }

  let load: string | undefined;
  const atLoad = rest.match(/\s+@\s*(.+)$/);
  if (atLoad) {
    load = atLoad[1].trim();
    rest = rest.slice(0, atLoad.index).trim();
  } else {
    const lenient = rest.match(LENIENT_LOAD);
    if (lenient) {
      load = lenient[1].trim();
      rest = (rest.slice(0, lenient.index) + rest.slice((lenient.index || 0) + lenient[0].length)).replace(/\s{2,}/g, ' ').trim();
    }
  }

  const alts = [bracketAlt, slashAlt].filter((value): value is string => Boolean(value));
  return { reps, name: rest.trim(), load, alts };
}

function parsePartLine(value: string): PartParse | undefined {
  const minutesMatch = value.match(MINUTES_PATTERN) || value.match(MINUTES_DASH);
  const startsWithPartWord = PART_WORDS.test(value.trim());
  if (!minutesMatch && !startsWithPartWord) return undefined;

  const minutes = minutesMatch ? Number(minutesMatch[1]) : undefined;
  const format = FORMAT_WORDS.find(([, pattern]) => pattern.test(value))?.[0];
  const teamOf = value.match(TEAM_OF);
  const team = teamOf
    ? `Team of ${teamOf[1] || teamOf[2]}`
    : TEAM_PAIRS_DE.test(value)
      ? 'Team of 2'
      : TEAM_TRIPLE_DE.test(value)
        ? 'Team of 3'
        : undefined;
  const roundsMatch = value.match(ROUNDS_WORD);
  const rounds = roundsMatch ? Number(roundsMatch[1]) : undefined;

  // Title: strip minutes/format/team/rounds fragments and leftover separators for a clean label.
  let title = value
    .replace(MINUTES_PATTERN, '')
    .replace(MINUTES_DASH, '')
    .replace(ROUNDS_WORD, '')
    .replace(TEAM_OF, '')
    .replace(TEAM_PAIRS_DE, '')
    .replace(TEAM_TRIPLE_DE, '')
    .trim();
  for (const [, pattern] of FORMAT_WORDS) title = title.replace(pattern, '');
  title = title.replace(/[,·|–—-]+\s*$/, '').replace(/^[,·|–—-]+\s*/, '').replace(/\s{2,}/g, ' ').trim();
  if (!title) title = startsWithPartWord ? value.match(PART_WORDS)?.[0] || 'Workout' : 'Workout';

  return { title, minutes, format, team, rounds };
}

function parseGroupLine(value: string): GroupParse | undefined {
  if (GROUP_LABEL.test(value)) {
    return { title: value.replace(/:\s*$/, '').trim() };
  }
  const colonMatch = value.match(/^(.{1,40}?):\s*(.+)$/);
  if (colonMatch) {
    const format = FORMAT_WORDS.find(([, pattern]) => pattern.test(colonMatch[2]))?.[0];
    const title = format ? colonMatch[2].replace(FORMAT_WORDS.find(([, p]) => p.test(colonMatch[2]))![1], '').trim() : colonMatch[2].trim();
    return { label: colonMatch[1].trim(), title, format };
  }
  // A short, all-caps line reads as a group label (e.g. "FLOOR ROUND").
  if (value.length <= 40 && value === value.toUpperCase() && /[A-ZÀ-Ü]/.test(value) && !/\d{2,}/.test(value)) {
    return { title: value.trim() };
  }
  return undefined;
}

const BLOCK_TYPE_TO_KIND: Record<string, LineKind> = {
  section: 'group',
  sub: 'info',
  note: 'note',
  scheme: 'text',
  movement: 'move',
  text: 'text',
};

export function classifyLines(text: string): LineClassification[] {
  const results: LineClassification[] = [];
  if (typeof text !== 'string') return results;

  const lines = text.split(/\r?\n/);
  // Once a workout uses ANY strict '#' header, it is in notation mode for its
  // whole length: every content line defers to lib/workoutNotation.ts's own
  // parseContentLine instead of the lenient heuristics below, so a workout
  // that already parses correctly on the real board is never reinterpreted
  // differently here. Lenient part/group/movement detection is only for text
  // that has no strict header anywhere — genuine free text.
  const hasStrictHeader = lines.some((line) => /^#(?!#)\s*/.test(line.trim()));

  // True once we're still in "the leading paragraph directly under a part header"
  // — closed by the first group/move/check line, same rule as lib/workoutModel.ts.
  // Only used in lenient mode; strict mode has no such concept (production doesn't either).
  let infoOpen = false;
  let sawContentInPart = false;

  lines.forEach((raw, index) => {
    const value = raw.trim();
    if (!value) return;
    const lineNumber = index + 1;
    const push = (kind: LineKind, confidence: Confidence, parsed?: LineClassification['parsed']) => {
      results.push({ line: lineNumber, text: raw, kind, confidence, parsed });
    };

    // Strict notation first — never reinterpreted leniently, in either mode.
    if (/^#(?!#)\s*/.test(value)) {
      const segments = value.replace(/^#\s*/, '').split('|').map((s) => s.trim());
      const title = segments.shift() || 'Workout';
      const minutes = segments.map((s) => Number(s.match(/^(\d+)/)?.[1])).find((n) => !Number.isNaN(n) && n !== undefined);
      push('part', 'strict', { title, minutes });
      infoOpen = true;
      sawContentInPart = false;
      return;
    }
    if (/^##\s+/.test(value)) {
      push('group', 'strict', { title: value.replace(/^##\s+/, '').trim() });
      infoOpen = false;
      sawContentInPart = true;
      return;
    }
    if (/^~/.test(value)) {
      push('timer', 'strict');
      infoOpen = false;
      sawContentInPart = true;
      return;
    }
    if (/^!\s*/.test(value)) {
      push('note', 'strict');
      infoOpen = false;
      sawContentInPart = true;
      return;
    }
    if (/^-\s+/.test(value)) {
      push('text', 'strict');
      infoOpen = false;
      sawContentInPart = true;
      return;
    }
    if (/^>\s*/.test(value)) {
      push('info', 'strict');
      return;
    }

    if (hasStrictHeader) {
      // Notation mode: classify exactly the way the real board does.
      const warnings: WorkoutWarning[] = [];
      const block = parseContentLine({ text: raw, line: lineNumber }, warnings);
      const gotWarning = warnings.length > 0;
      const kind: LineKind = gotWarning && block.type === 'text' ? 'check' : BLOCK_TYPE_TO_KIND[block.type];
      const parsed: LineClassification['parsed'] = block.type === 'movement'
        ? { reps: block.reps || '', name: block.name, load: block.load, alts: block.alt ? [block.alt] : [] }
        : undefined;
      push(kind, gotWarning ? 'lenient' : 'strict', parsed);
      return;
    }

    // Lenient reading — only reached for text with no strict header anywhere.
    if (NOTE_PREFIX.test(value)) {
      push('note', 'lenient');
      infoOpen = false;
      sawContentInPart = true;
      return;
    }
    if (TEXT_PREFIX_WORDS.test(value)) {
      push('text', 'lenient');
      infoOpen = false;
      sawContentInPart = true;
      return;
    }
    if (ROUNDS_SCHEME_LINE.test(value)) {
      push('text', 'lenient');
      infoOpen = false;
      sawContentInPart = true;
      return;
    }

    const move = parseMoveLine(value);
    if (move) {
      push('move', 'lenient', move);
      infoOpen = false;
      sawContentInPart = true;
      return;
    }

    const group = parseGroupLine(value);
    if (group) {
      push('group', 'lenient', group);
      infoOpen = false;
      sawContentInPart = true;
      return;
    }

    const part = parsePartLine(value);
    if (part) {
      push('part', 'lenient', part);
      infoOpen = true;
      sawContentInPart = false;
      return;
    }

    if (infoOpen && !sawContentInPart) {
      push('info', 'lenient');
      return;
    }

    push('check', 'lenient');
  });

  return results;
}
