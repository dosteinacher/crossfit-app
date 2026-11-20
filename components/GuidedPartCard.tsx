'use client';

import { useId, useRef } from 'react';
import { Badge, Button, Label } from '@/components/ui';
import type { Item, Part, PartFormat } from '@/lib/workoutModel';
import type { MovementSuggestion } from '@/lib/pastWorkoutInsights';

const FORMAT_OPTIONS: Array<{ value: PartFormat; label: string }> = [
  { value: 'AMRAP', label: 'AMRAP' },
  { value: 'EMOM', label: 'EMOM' },
  { value: 'For Time', label: 'For Time' },
  { value: 'Rounds', label: 'Rounds' },
  { value: 'Intervals', label: 'Intervals' },
  { value: 'Strength', label: 'Strength' },
  { value: 'Skill', label: 'Skill' },
  { value: 'Other', label: 'Other…' },
];

const FORMAT_HELP: Record<PartFormat, string> = {
  AMRAP: 'As many rounds as possible. The board counts down the minutes.',
  EMOM: 'A movement every minute, on the minute, for the given number of minutes.',
  'For Time': 'Finish the work as fast as possible. The board counts up, with a time cap.',
  Rounds: 'A fixed number of rounds. Enter how many below.',
  Intervals: 'Work/rest intervals. Set the timer below.',
  Strength: 'A strength block. The board counts up.',
  Skill: 'A skill block. The board counts up.',
  Other: 'Name it yourself (Chipper, Death by, Ladder, You go I go…) and choose how the board times it.',
};

const TEAM_OPTIONS = ['Solo', 'Team of 2', 'Team of 3', 'Team of 4', 'Team of 5'];

function newMovement(): Item {
  return { kind: 'movement', reps: '', name: '', load: '', alts: [] };
}

function timerSummary(part: Part): string {
  if (part.format === 'Intervals' || part.timerMode === 'intervals') {
    return part.timer ? 'Intervals · set below' : 'Intervals · no timer set yet';
  }
  if (part.format === 'EMOM') return `EMOM · cap ${part.minutes || '—'}′`;
  if (part.format === 'AMRAP') return `Countdown · cap ${part.minutes || '—'}′`;
  if (part.timerMode === 'countdown') return `Countdown · cap ${part.minutes || '—'}′`;
  if (part.timerMode === 'countup') return part.minutes ? `Count up · cap ${part.minutes}′` : 'Count up · no cap';
  if (part.format === 'For Time') return part.minutes ? `Count up · cap ${part.minutes}′` : 'Count up · no cap';
  return 'Count up · no cap';
}

export default function GuidedPartCard({
  part,
  index,
  total,
  isPreviewing,
  onChange,
  onRemove,
  onMove,
  onPreview,
  warnings,
  movementSuggestions,
}: {
  part: Part;
  index: number;
  total: number;
  isPreviewing: boolean;
  onChange: (next: Part) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onPreview: () => void;
  /** Notation-parser warnings for this workout, keyed by the exact raw line text (Phase 3). */
  warnings?: Map<string, string>;
  /** Movement name/weight/easier-option autocomplete, most frequent first (Phase 4). */
  movementSuggestions?: MovementSuggestion[];
}) {
  const newRowFocusRef = useRef<HTMLInputElement | null>(null);

  function patch(fields: Partial<Part>) {
    onChange({ ...part, ...fields, headerRaw: undefined });
  }

  function setFormat(format: PartFormat) {
    const next: Partial<Part> = { format, headerRaw: undefined };
    if (format !== 'Other') next.otherName = undefined;
    if (format !== 'Rounds') { /* keep rounds value, just hide the field */ }
    onChange({ ...part, ...next });
  }

  function setItem(itemIndex: number, item: Item) {
    const items = part.items.slice();
    items[itemIndex] = item;
    onChange({ ...part, items });
  }

  function removeItem(itemIndex: number) {
    const items = part.items.slice();
    items.splice(itemIndex, 1);
    const extras = (part.extras || []).map((extra) =>
      extra.index > itemIndex ? { ...extra, index: extra.index - 1, raw: undefined } : extra
    );
    onChange({ ...part, items, extras });
  }

  function addItem(item: Item, focusNext = false) {
    const items = [...part.items, item];
    onChange({ ...part, items });
    if (focusNext) {
      requestAnimationFrame(() => newRowFocusRef.current?.focus());
    }
  }

  function moveItem(itemIndex: number, direction: -1 | 1) {
    const target = itemIndex + direction;
    if (target < 0 || target >= part.items.length) return;
    const items = part.items.slice();
    [items[itemIndex], items[target]] = [items[target], items[itemIndex]];
    onChange({ ...part, items });
  }

  const showRounds = part.format === 'Rounds';
  const showOtherName = part.format === 'Other';
  const showTeamOther = Number(part.team.replace(/\D/g, '')) > 5 || /^team\s+of\s+\d+$/i.test(part.team) === false && part.team.trim() !== '' && !TEAM_OPTIONS.includes(part.team) && part.team !== 'Solo';

  return (
    <div
      className={`rounded-[14px] border-2 bg-white p-4 md:p-5 ${
        isPreviewing ? 'border-ink' : 'border-line'
      }`}
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-lime font-display text-lg font-black text-ink">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-[160px] flex-1">
          <Label className="mb-1 block">Part name</Label>
          <input
            value={part.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="e.g. Warm-up"
            className="min-h-11 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base font-bold text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
          />
        </div>
        <div className="w-24">
          <Label className="mb-1 block">Minutes</Label>
          <input
            value={part.minutes}
            onChange={(e) => patch({ minutes: e.target.value.replace(/[^\d]/g, '') })}
            inputMode="numeric"
            placeholder="15"
            className="min-h-11 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
          />
        </div>
        <div className="flex items-center gap-2">
          {total > 1 && (
            <span className="flex gap-1">
              <button type="button" aria-label="Move part up" disabled={index === 0} onClick={() => onMove(-1)} className="min-h-9 min-w-9 rounded-sm border border-line bg-paper text-ink disabled:opacity-30">↑</button>
              <button type="button" aria-label="Move part down" disabled={index === total - 1} onClick={() => onMove(1)} className="min-h-9 min-w-9 rounded-sm border border-line bg-paper text-ink disabled:opacity-30">↓</button>
            </span>
          )}
          <Button
            type="button"
            variant={isPreviewing ? 'primary' : 'secondary'}
            onClick={onPreview}
            className="whitespace-nowrap"
          >
            {isPreviewing ? '● In preview' : 'Preview'}
          </Button>
          {total > 1 && (
            <button type="button" aria-label="Remove part" onClick={onRemove} className="min-h-9 min-w-9 rounded-sm border border-line bg-paper text-ink-2 hover:text-danger">✕</button>
          )}
        </div>
      </div>

      <Label className="mb-2 block">How is it played?</Label>
      <div className="mb-1 flex flex-wrap gap-1.5" role="group" aria-label="Format">
        {FORMAT_OPTIONS.map((option) => {
          const selected = part.format === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => setFormat(option.value)}
              className={`min-h-9 rounded-full px-3 text-sm font-bold ${selected ? 'bg-ink text-white' : 'border border-line bg-paper text-ink hover:bg-canvas'}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="mb-3 text-[13px] text-ink-2">{FORMAT_HELP[part.format]}</p>

      {showOtherName && (
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-1 block">Format name</Label>
            <input
              value={part.otherName || ''}
              onChange={(e) => patch({ otherName: e.target.value })}
              placeholder="e.g. Chipper, Death by, Ladder, You go I go"
              className="min-h-11 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
            />
          </div>
          <div>
            <Label className="mb-1 block">Timer on the board</Label>
            <div className="flex gap-1.5" role="group" aria-label="Timer mode">
              {([
                { value: 'countup', label: 'Count up' },
                { value: 'countdown', label: 'Countdown' },
                { value: 'intervals', label: 'Intervals' },
              ] as const).map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={(part.timerMode || 'countup') === mode.value}
                  onClick={() => patch({ timerMode: mode.value })}
                  className={`min-h-9 rounded-full px-3 text-sm font-bold ${
                    (part.timerMode || 'countup') === mode.value ? 'bg-ink text-white' : 'border border-line bg-paper text-ink hover:bg-canvas'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Label className="mb-2 block">Who works together?</Label>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Team">
          {TEAM_OPTIONS.map((team) => (
            <button
              key={team}
              type="button"
              aria-pressed={part.team === team}
              onClick={() => patch({ team })}
              className={`min-h-9 rounded-full px-3 text-sm font-bold ${part.team === team ? 'bg-ink text-white' : 'border border-line bg-paper text-ink hover:bg-canvas'}`}
            >
              {team}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={showTeamOther}
            onClick={() => patch({ team: showTeamOther ? part.team : 'Team of 6' })}
            className={`min-h-9 rounded-full px-3 text-sm font-bold ${showTeamOther ? 'bg-ink text-white' : 'border border-line bg-paper text-ink hover:bg-canvas'}`}
          >
            Other…
          </button>
        </div>
        {showTeamOther && (
          <input
            type="number"
            min={6}
            value={part.team.match(/\d+/)?.[0] || ''}
            onChange={(e) => patch({ team: e.target.value ? `Team of ${e.target.value}` : '' })}
            placeholder="Team size"
            className="min-h-9 w-28 rounded-sm border border-line bg-paper px-3 py-1 text-sm text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
          />
        )}
        {showRounds && (
          <div className="w-28">
            <Label className="mb-1 block">Rounds</Label>
            <input
              value={part.rounds || ''}
              onChange={(e) => patch({ rounds: e.target.value.replace(/[^\d]/g, '') })}
              inputMode="numeric"
              placeholder="5"
              className="min-h-9 w-full rounded-sm border border-line bg-paper px-3 py-1 text-sm text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
            />
          </div>
        )}
      </div>

      <div className="mb-3">
        <Label className="mb-1 block">Instructions for the athletes <span className="font-normal normal-case tracking-normal text-ink-2">(optional)</span></Label>
        <textarea
          value={part.instructions.join('\n')}
          onChange={(e) => patch({ instructions: e.target.value.split('\n') })}
          placeholder="e.g. One athlete works, one rests. Switch after every round."
          rows={Math.max(1, part.instructions.length)}
          className="w-full resize-y rounded-sm border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
        />
      </div>

      {part.items.length > 0 && (
        <div className="mb-2 hidden grid-cols-[1fr_2fr_1fr_1fr_auto] gap-2 px-1 text-[11px] font-bold uppercase tracking-[.1em] text-ink-2 sm:grid">
          <span>Reps / time</span>
          <span>Movement</span>
          <span>Weight</span>
          <span>Easier option</span>
          <span />
        </div>
      )}

      <div className="space-y-2">
        {part.items.map((item, itemIndex) => (
          <GuidedRow
            key={itemIndex}
            item={item}
            onChange={(next) => setItem(itemIndex, next)}
            onRemove={() => removeItem(itemIndex)}
            onMoveUp={itemIndex > 0 ? () => moveItem(itemIndex, -1) : undefined}
            onMoveDown={itemIndex < part.items.length - 1 ? () => moveItem(itemIndex, 1) : undefined}
            onEnter={() => addItem(newMovement(), true)}
            focusRef={itemIndex === part.items.length - 1 ? newRowFocusRef : undefined}
            warning={item.raw ? warnings?.get(item.raw) : undefined}
            movementSuggestions={movementSuggestions}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => addItem(newMovement(), true)} className="min-h-9 rounded-full bg-ink px-3 text-sm font-bold text-white">+ Movement</button>
        <button type="button" onClick={() => addItem({ kind: 'section', text: '' })} className="min-h-9 rounded-full border border-line bg-paper px-3 text-sm font-bold text-ink hover:bg-canvas">+ Station / group</button>
        <button type="button" onClick={() => addItem({ kind: 'note', text: '' })} className="min-h-9 rounded-full border border-line bg-paper px-3 text-sm font-bold text-ink hover:bg-canvas">+ Note</button>
        <button type="button" onClick={() => addItem({ kind: 'text', text: '' })} className="min-h-9 rounded-full border border-dashed border-line bg-paper px-3 text-sm font-bold text-ink hover:bg-canvas">+ Text line</button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-sm bg-canvas px-3 py-2 text-[13px]">
        <span className="font-bold text-ink">⏱ Timer on the board: {timerSummary(part)}</span>
        {part.format !== 'Other' && <Badge variant="neutral">set from format + minutes</Badge>}
      </div>
    </div>
  );
}

function GuidedRow({
  item,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onEnter,
  focusRef,
  warning,
  movementSuggestions,
}: {
  item: Item;
  onChange: (next: Item) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onEnter: () => void;
  focusRef?: React.RefObject<HTMLInputElement | null>;
  /** The notation parser's warning for this line, if any (Phase 3). */
  warning?: string;
  /** Movement name/weight/easier-option autocomplete, most frequent first (Phase 4). */
  movementSuggestions?: MovementSuggestion[];
}) {
  const movementListId = useId();

  /** Once a movement name matches a known one, fill in its usual weight / easier option — but only into empty fields, and only accepted once the user leaves the name field (Tab or click away), never typed over something they wrote. */
  function fillSuggestedDetails(name: string) {
    if (item.kind !== 'movement') return;
    const match = movementSuggestions?.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
    if (!match) return;
    onChange({
      ...item,
      load: item.load || match.mostCommonLoad || '',
      alts: item.alts.length ? item.alts : (match.mostCommonAlt ? [match.mostCommonAlt] : []),
    });
  }
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      (e.key === 'ArrowUp' ? onMoveUp : onMoveDown)?.();
      return;
    }
    if (e.key === 'Enter' && item.kind === 'movement') {
      e.preventDefault();
      onEnter();
    }
  }

  const removeButton = (
    <button type="button" aria-label="Remove row" onClick={onRemove} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-line bg-paper text-ink-2 hover:text-danger">✕</button>
  );
  const warningBadge = warning ? (
    <span
      role="img"
      aria-label={`Warning: ${warning}`}
      title={warning}
      className="flex h-9 w-9 shrink-0 cursor-help items-center justify-center text-base"
    >
      ⚠️
    </span>
  ) : null;

  if (item.kind === 'movement') {
    return (
      <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[1fr_2fr_1fr_1fr_auto]">
        <input
          ref={focusRef}
          value={item.reps}
          onChange={(e) => onChange({ ...item, reps: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder="10"
          className="min-h-10 w-full rounded-sm border border-line bg-paper px-2 py-1 font-display text-lg font-extrabold text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
        />
        <input
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          onBlur={(e) => fillSuggestedDetails(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. KB Swings"
          list={movementSuggestions?.length ? movementListId : undefined}
          className="col-span-2 min-h-10 w-full rounded-sm border border-line bg-paper px-2 py-1 text-sm text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15 sm:col-span-1"
        />
        {movementSuggestions && movementSuggestions.length > 0 && (
          <datalist id={movementListId}>
            {movementSuggestions.map((suggestion) => (
              <option key={suggestion.name} value={suggestion.name} />
            ))}
          </datalist>
        )}
        <input
          value={item.load}
          onChange={(e) => onChange({ ...item, load: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder="24/16 kg"
          className="min-h-10 w-full rounded-sm border border-line bg-paper px-2 py-1 text-sm text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
        />
        <input
          value={item.alts.join(' · ')}
          onChange={(e) => onChange({ ...item, alts: e.target.value.split('·').map((v) => v.trim()).filter(Boolean) })}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Russian swings"
          className="min-h-10 w-full rounded-sm border border-line bg-paper px-2 py-1 text-sm text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
        />
        {removeButton}
      </div>
    );
  }

  if (item.kind === 'section') {
    return (
      <div className="flex items-center gap-2 rounded-sm bg-ink px-2 py-1">
        <span className="shrink-0 rounded-sm bg-lime px-2 py-1 text-[11px] font-bold uppercase tracking-[.1em] text-ink">Station / group</span>
        <input
          value={item.text}
          onChange={(e) => onChange({ ...item, text: e.target.value })}
          placeholder="e.g. Station 1 · Swing & Lunge"
          className="min-h-9 flex-1 bg-transparent px-1 font-display text-sm font-extrabold uppercase tracking-wide text-white placeholder:text-white/50 focus:outline-none"
        />
        {removeButton}
      </div>
    );
  }

  if (item.kind === 'note') {
    return (
      <div className="flex items-center gap-2 border-l-[6px] border-lime bg-lime/15 px-2 py-1">
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-[.1em] text-ink-2">Note</span>
        <input
          value={item.text}
          onChange={(e) => onChange({ ...item, text: e.target.value })}
          placeholder="e.g. Light extra weight for the lunges"
          className="min-h-9 flex-1 bg-transparent px-1 text-sm font-semibold text-ink focus:outline-none"
        />
        {removeButton}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-sm border border-dashed border-line px-2 py-1">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-[.1em] text-ink-2">Text</span>
      <input
        value={item.text}
        onChange={(e) => onChange({ ...item, text: e.target.value })}
        placeholder="Anything else, shown as typed — e.g. Then: 2:00 easy row"
        className="min-h-9 flex-1 bg-transparent px-1 text-sm text-ink focus:outline-none"
      />
      {warningBadge}
      {removeButton}
    </div>
  );
}
