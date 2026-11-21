'use client';

/**
 * v9 Phase 2 — "paste first, correct second" Create/Edit workout editor.
 *
 * Replaces the v8 Simple/Text switch with a single text box (left) that
 * reads pasted or typed text leniently (lib/classifyLines.ts), and a
 * preview (right) that groups the same reading into parts with a one-tap
 * ✎ Edit per part and one-tap fixes for lines the reading isn't sure about
 * (CHECK). Editing a part rewrites only that part's own header line, as
 * strict PURE notation — every other line is left exactly as typed.
 */

import { useMemo, useRef, useState } from 'react';
import { classifyLines, type LineClassification, type MoveParse, type PartParse } from '@/lib/classifyLines';
import { cleanPastedText } from '@/lib/pasteCleanup';
import { parseWorkout } from '@/lib/workoutNotation';

const TAG_LABEL: Record<LineClassification['kind'], string> = {
  part: '#',
  group: '##',
  timer: '~',
  move: '·',
  info: '>',
  note: '!',
  text: '-',
  check: '?',
};

const TAG_CLASS: Record<LineClassification['kind'], string> = {
  part: 'bg-ink text-lime',
  group: 'border border-ink text-ink',
  timer: 'border border-ink text-ink',
  move: 'bg-lime text-ink',
  info: 'border border-line-2 text-ink-2',
  note: 'border border-line-2 text-ink-2',
  text: 'border border-line-2 text-ink-2',
  check: 'bg-[#FFF4CC] text-[#E5B800] border border-[#E5B800]',
};

const TEAM_OPTIONS = ['Solo', 'Team of 2', 'Team of 3', 'Team of 4', 'Team of 5', 'Team of 6'];
const FORMAT_OPTIONS = ['AMRAP', 'EMOM', 'For Time', 'Chipper', 'Intervals', 'Tabata', 'Strength', 'Skill', 'Other'];

interface PreviewPart {
  /** 1-indexed source line of the header, or -1 for text before any part. */
  headerLine: number;
  confidence: 'strict' | 'lenient' | 'none';
  title: string;
  minutes?: number;
  format?: string;
  team?: string;
  rounds?: number;
  rows: LineClassification[];
}

function groupIntoParts(classified: LineClassification[]): PreviewPart[] {
  const parts: PreviewPart[] = [];
  let current: PreviewPart | null = null;
  for (const entry of classified) {
    if (entry.kind === 'part') {
      const parsed = entry.parsed as PartParse | undefined;
      current = {
        headerLine: entry.line,
        confidence: entry.confidence,
        title: parsed?.title || entry.text.replace(/^#\s*/, '').split('|')[0].trim() || 'Workout',
        minutes: parsed?.minutes,
        format: parsed?.format,
        team: parsed?.team,
        rounds: parsed?.rounds,
        rows: [],
      };
      parts.push(current);
      continue;
    }
    if (!current) {
      current = { headerLine: -1, confidence: 'none', title: '', rows: [] };
      parts.push(current);
    }
    current.rows.push(entry);
  }
  return parts;
}

function moveSummary(move: MoveParse) {
  return `${move.reps} ${move.name}${move.load ? ` @ ${move.load}` : ''}${move.alts.length ? ` / ${move.alts.join(' / ')}` : ''}`.trim();
}

function partOneLiner(part: PreviewPart): string {
  const bits: string[] = [];
  if (part.format) bits.push(part.format);
  bits.push(part.minutes ? `${part.minutes} min` : 'No cap');
  if (part.rounds) bits.push(`${part.rounds} rounds`);
  if (part.team) bits.push(part.team);
  const moveCount = part.rows.filter((r) => r.kind === 'move').length;
  if (moveCount) bits.push(`${moveCount} movement${moveCount === 1 ? '' : 's'}`);
  return bits.join(' · ') || 'No details yet';
}

function replaceLine(text: string, lineNumber: number, newLine: string): string {
  const lines = text.split(/\r?\n/);
  if (lineNumber < 1 || lineNumber > lines.length) return text;
  lines[lineNumber - 1] = newLine;
  return lines.join('\n');
}

function buildHeaderLine(title: string, minutes: string, format: string, team: string, rounds: string) {
  const segments = [title.trim() || 'Workout'];
  if (minutes.trim()) segments.push(minutes.trim());
  if (format.trim() && format !== 'Other') segments.push(format.trim());
  if (team.trim() && team !== 'Solo') segments.push(team.trim());
  if (rounds.trim()) segments.push(`${rounds.trim()} Rounds`);
  const [first, ...rest] = segments;
  return `# ${first}${rest.map((s) => ` | ${s}`).join('')}`;
}

interface EditFields {
  title: string;
  minutes: string;
  format: string;
  team: string;
  rounds: string;
}

function fieldsFor(part: PreviewPart, text: string): EditFields {
  if (part.confidence === 'strict' && part.headerLine > 0) {
    // Defer to the production parser for format/team on an already-strict header,
    // so the edit panel's defaults exactly match what the board would show.
    const strictHeaderLines = text
      .split(/\r?\n/)
      .map((line, i) => ({ line: line.trim(), index: i + 1 }))
      .filter((l) => /^#(?!#)\s*/.test(l.line));
    const ordinal = strictHeaderLines.findIndex((l) => l.index === part.headerLine);
    const productionPart = ordinal >= 0 ? parseWorkout(text).parts[ordinal] : undefined;
    return {
      title: productionPart?.title ?? part.title,
      minutes: productionPart?.minutes ? String(productionPart.minutes) : '',
      format: productionPart?.format === 'FOR TIME' ? 'For Time' : (productionPart?.format ? productionPart.format.charAt(0) + productionPart.format.slice(1).toLowerCase() : 'Other'),
      team: productionPart?.team ? `Team of ${productionPart.team.match(/\d+/)?.[0] || ''}` : 'Solo',
      rounds: '',
    };
  }
  return {
    title: part.title,
    minutes: part.minutes ? String(part.minutes) : '',
    format: part.format || 'Other',
    team: part.team || 'Solo',
    rounds: part.rounds ? String(part.rounds) : '',
  };
}

function PartEditFields({
  editFields,
  setEditFields,
  onCancel,
  onDone,
}: {
  editFields: EditFields;
  setEditFields: (fields: EditFields) => void;
  onCancel: () => void;
  onDone: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-[12px] font-bold text-ink">
          Part name
          <input
            type="text"
            value={editFields.title}
            onChange={(e) => setEditFields({ ...editFields, title: e.target.value })}
            className="mt-1 min-h-9 w-full rounded-sm border border-line bg-paper px-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </label>
        <label className="block text-[12px] font-bold text-ink">
          Minutes
          <input
            type="number"
            min={0}
            value={editFields.minutes}
            onChange={(e) => setEditFields({ ...editFields, minutes: e.target.value })}
            placeholder="No cap"
            className="mt-1 min-h-9 w-full rounded-sm border border-line bg-paper px-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </label>
        <label className="block text-[12px] font-bold text-ink">
          Who works together
          <select
            value={editFields.team}
            onChange={(e) => setEditFields({ ...editFields, team: e.target.value })}
            className="mt-1 min-h-9 w-full rounded-sm border border-line bg-paper px-2 text-sm text-ink focus:border-ink focus:outline-none"
          >
            {TEAM_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block text-[12px] font-bold text-ink">
          How is it played
          <select
            value={editFields.format}
            onChange={(e) => setEditFields({ ...editFields, format: e.target.value })}
            className="mt-1 min-h-9 w-full rounded-sm border border-line bg-paper px-2 text-sm text-ink focus:border-ink focus:outline-none"
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="block text-[12px] font-bold text-ink">
          Rounds
          <input
            type="number"
            min={0}
            value={editFields.rounds}
            onChange={(e) => setEditFields({ ...editFields, rounds: e.target.value })}
            className="mt-1 min-h-9 w-full rounded-sm border border-line bg-paper px-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-9 rounded-sm border border-line bg-paper px-3 text-[13px] font-bold text-ink hover:bg-canvas"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onDone}
          className="min-h-9 rounded-sm bg-lime px-3 text-[13px] font-bold text-ink hover:opacity-90"
        >
          Done
        </button>
      </div>
      <p className="text-[11px] text-ink-2">Only this part&apos;s first line changes. Everything else stays as you wrote it.</p>
    </div>
  );
}

export default function PasteFirstWorkoutEditor({
  title,
  description,
  onDescriptionChange,
  onTitleChange,
  mobileView,
  useBottomSheetForEdit,
}: {
  title: string;
  description: string;
  onDescriptionChange: (text: string) => void;
  onTitleChange?: (title: string) => void;
  /**
   * On a phone, only one side is shown at a time (Text|Preview tabs own the
   * choice from outside); on desktop both sides always show side by side
   * and this is omitted.
   */
  mobileView?: 'text' | 'preview';
  /** On a phone, ✎ Edit opens as a bottom sheet instead of inline in the preview. */
  useBottomSheetForEdit?: boolean;
}) {
  void title;
  void onTitleChange;
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<EditFields | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const classified = useMemo(() => classifyLines(description), [description]);
  const parts = useMemo(() => groupIntoParts(classified), [classified]);
  const checkCount = classified.filter((c) => c.kind === 'check').length;
  const moveCount = classified.filter((c) => c.kind === 'move').length;
  const partCount = parts.filter((p) => p.headerLine > 0).length;

  const lines = description.split(/\r?\n/);

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;
    e.preventDefault();
    const cleaned = cleanPastedText(pasted);
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = description.slice(0, start) + cleaned + description.slice(end);
    onDescriptionChange(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + cleaned.length;
    });
  }

  function syncGutterScroll() {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  function startEdit(part: PreviewPart) {
    if (part.headerLine < 1) return;
    setEditingLine(part.headerLine);
    setEditFields(fieldsFor(part, description));
  }

  function commitEdit() {
    if (editingLine === null || !editFields) return;
    const newLine = buildHeaderLine(editFields.title, editFields.minutes, editFields.format, editFields.team, editFields.rounds);
    onDescriptionChange(replaceLine(description, editingLine, newLine));
    setEditingLine(null);
    setEditFields(null);
  }

  function fixCheckLine(lineNumber: number, as: 'note' | 'movement' | 'text') {
    const current = lines[lineNumber - 1] ?? '';
    const bare = current.trim();
    let next = current;
    if (as === 'note') next = `! ${bare}`;
    else if (as === 'text') next = `- ${bare}`;
    else if (as === 'movement') next = /^\d/.test(bare) ? bare : `10 ${bare}`;
    onDescriptionChange(replaceLine(description, lineNumber, next));
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink">Workout</p>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
          <span>{partCount} part{partCount === 1 ? '' : 's'}</span>
          <span aria-hidden="true">·</span>
          <span>{moveCount} movement{moveCount === 1 ? '' : 's'}</span>
          {checkCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#E5B800]">{checkCount} to check</span>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={mobileView === 'preview' ? 'hidden md:block' : ''}>
          <p className="mb-1.5 text-[13px] font-bold uppercase tracking-wide text-ink-2">Your workout</p>
          <div className="flex overflow-hidden rounded-sm border border-line bg-paper">
            <div
              ref={gutterRef}
              aria-hidden="true"
              className="select-none overflow-hidden border-r border-line-2 bg-canvas px-1.5 py-2 font-mono text-[11px] leading-5"
              style={{ width: 34 }}
            >
              {lines.map((_, i) => {
                const entry = classified.find((c) => c.line === i + 1);
                return (
                  <div key={i} className="flex h-5 items-center justify-center">
                    {entry && (
                      <span className={`rounded px-1 text-[9px] font-bold leading-4 ${TAG_CLASS[entry.kind]}`}>
                        {TAG_LABEL[entry.kind]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              onPaste={handlePaste}
              onScroll={syncGutterScroll}
              placeholder={'Paste a workout from Word or WhatsApp, or type it in PURE notation.\n\ne.g.\n# Warm-up | 15\n2 Rounds\n10 Air Squats'}
              spellCheck={false}
              className="min-h-[360px] flex-1 resize-y bg-paper px-3 py-2 font-mono text-[13px] leading-5 text-ink placeholder:text-ink-2 focus:outline-none"
            />
          </div>
        </div>

        <div className={mobileView === 'text' ? 'hidden md:block' : ''}>
          <p className="mb-1.5 text-[13px] font-bold uppercase tracking-wide text-ink-2">Preview · what the TV shows</p>
          <div className="min-h-[360px] space-y-2 rounded-sm border border-line bg-canvas p-2">
            {parts.every((p) => p.headerLine < 0 && p.rows.length === 0) && (
              <p className="p-3 text-sm text-ink-2">Nothing here yet. Paste or type a workout on the left.</p>
            )}
            {parts.map((part, index) => (
              <div key={index} className="rounded-sm border border-line bg-paper">
                {part.headerLine > 0 ? (
                  <div className="flex items-center justify-between gap-2 border-b border-line-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">
                        <span className="mr-1.5 text-ink-2">{index + 1}.</span>
                        {part.title}
                      </p>
                      <p className="text-[12px] text-ink-2">{partOneLiner(part)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(part)}
                      className="shrink-0 rounded-sm border border-line px-2 py-1 text-[12px] font-bold text-ink hover:bg-canvas"
                    >
                      ✎ Edit
                    </button>
                  </div>
                ) : null}

                {!useBottomSheetForEdit && editingLine === part.headerLine && editFields && (
                  <div className="border-b border-line-2 bg-canvas px-3 py-3">
                    <PartEditFields
                      editFields={editFields}
                      setEditFields={setEditFields}
                      onCancel={() => { setEditingLine(null); setEditFields(null); }}
                      onDone={commitEdit}
                    />
                  </div>
                )}

                <div className="divide-y divide-line-2">
                  {part.rows.map((row) => (
                    <div key={row.line} className="px-3 py-1.5 text-sm text-ink">
                      {row.kind === 'move' ? (
                        <span>{row.parsed ? moveSummary(row.parsed as MoveParse) : row.text.trim()}</span>
                      ) : row.kind === 'group' ? (
                        <span className="font-bold">{row.text.trim().replace(/^##\s+/, '')}</span>
                      ) : row.kind === 'note' ? (
                        <span className="italic text-ink-2">{row.text.trim().replace(/^!\s*/, '')}</span>
                      ) : row.kind === 'check' ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm bg-[#FFF4CC] px-2 py-1.5">
                          <span className="text-[#6b5500]">{row.text.trim()}</span>
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => fixCheckLine(row.line, 'note')} className="min-h-7 rounded-sm border border-[#E5B800] bg-paper px-2 text-[11px] font-bold text-ink hover:bg-canvas">Note</button>
                            <button type="button" onClick={() => fixCheckLine(row.line, 'movement')} className="min-h-7 rounded-sm border border-[#E5B800] bg-paper px-2 text-[11px] font-bold text-ink hover:bg-canvas">Movement</button>
                            <button type="button" onClick={() => fixCheckLine(row.line, 'text')} className="min-h-7 rounded-sm border border-[#E5B800] bg-paper px-2 text-[11px] font-bold text-ink hover:bg-canvas">Keep as text</button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-ink-2">{row.text.trim().replace(/^[->]\s*/, '')}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {useBottomSheetForEdit && editingLine !== null && editFields && (
        <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Edit part">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => { setEditingLine(null); setEditFields(null); }}
          />
          <div className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border-t border-line bg-paper p-4 pb-[calc(16px_+_env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.15)]">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-2" aria-hidden="true" />
            <p className="mb-3 text-sm font-bold text-ink">Edit part</p>
            <PartEditFields
              editFields={editFields}
              setEditFields={setEditFields}
              onCancel={() => { setEditingLine(null); setEditFields(null); }}
              onDone={commitEdit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
