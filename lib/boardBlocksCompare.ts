/**
 * Shared by scripts/board-diff.ts and its tests: reduces a workout's board
 * rendering, from both the production parser (lib/workoutNotation.ts) and
 * the new lenient classifier (lib/classifyLines.ts), to the same simple
 * shape, so the two can be compared directly. See board-diff.ts for why.
 */
import { parseWorkout, type WorkoutBlock } from './workoutNotation';
import { classifyLines, type MoveParse } from './classifyLines';

export interface Block {
  kind: string;
  text: string;
}

export function blocksFromProduction(description: string): Block[] {
  const { parts } = parseWorkout(description);
  return parts.flatMap((part) =>
    part.blocks.map((block: WorkoutBlock) => ({
      kind: block.type === 'sub' || block.type === 'scheme' ? 'text' : block.type,
      text:
        block.type === 'movement'
          ? `${block.reps || ''} ${block.name}${block.load ? ` @ ${block.load}` : ''}${block.alt ? ` / ${block.alt}` : ''}`.trim()
          : block.name,
    }))
  );
}

function moveText(move: MoveParse): string {
  return `${move.reps} ${move.name}${move.load ? ` @ ${move.load}` : ''}${move.alts.length ? ` / ${move.alts.join(' / ')}` : ''}`.trim();
}

export function blocksFromClassifier(description: string): Block[] {
  const lines = classifyLines(description);
  const blocks: Block[] = [];
  for (const entry of lines) {
    switch (entry.kind) {
      case 'move':
        blocks.push({ kind: 'movement', text: entry.parsed ? moveText(entry.parsed as MoveParse) : entry.text.trim() });
        break;
      case 'group':
        blocks.push({ kind: 'section', text: entry.text.trim().replace(/^##\s+/, '') });
        break;
      case 'note':
        blocks.push({ kind: 'note', text: entry.text.trim().replace(/^!\s*/, '') });
        break;
      case 'text':
      case 'info':
      case 'check':
        blocks.push({ kind: 'text', text: entry.text.trim().replace(/^[->]\s*/, '') });
        break;
      case 'part':
      case 'timer':
        break; // Not a board block: a part is the board title, a timer sets the clock.
    }
  }
  return blocks;
}

export function hasStrictHeader(description: string): boolean {
  return description.split(/\r?\n/).some((line) => /^#(?!#)\s*/.test(line.trim()));
}

export function diffBlocks(before: Block[], after: Block[]): string[] {
  const max = Math.max(before.length, after.length);
  const lines: string[] = [];
  for (let i = 0; i < max; i += 1) {
    const b = before[i];
    const a = after[i];
    if (b && a && b.kind === a.kind && b.text === a.text) continue;
    lines.push(`    [${i}] before: ${b ? `${b.kind}: ${b.text}` : '(none)'}`);
    lines.push(`    [${i}] after:  ${a ? `${a.kind}: ${a.text}` : '(none)'}`);
  }
  return lines;
}
