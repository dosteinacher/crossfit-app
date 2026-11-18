'use client';

import { useMemo, useRef, useState } from 'react';
import {
  convertLegacyWorkoutToNotation,
  parseWorkout,
  serializeTimer,
} from '@/lib/workoutNotation';
import { removeTimerLine, hasTimerLine, writeTimerLine } from '@/lib/workoutTimerNotation';
import IntervalTimerSetup from '@/components/IntervalTimerSetup';
import WorkoutPartContent from '@/components/WorkoutPartContent';

type EditorTab = 'write' | 'preview';

function getCursorLine(textarea: HTMLTextAreaElement) {
  return textarea.value.slice(0, textarea.selectionStart).split('\n').length;
}

function getPartStarts(description: string, parts: ReturnType<typeof parseWorkout>['parts']) {
  if (parts.length <= 1) return [1];
  const lines = description.split('\n');
  const explicitStarts = lines.flatMap((value, index) => /^#(?!#)\s/.test(value.trim()) ? [index + 1] : []);

  if (explicitStarts.length === parts.length) return explicitStarts;
  let previousStart = 0;
  return parts.map((part, index) => {
    if (index === 0) {
      previousStart = 1;
      return previousStart;
    }
    const blockLines = part.blocks.map((block) => block.line).filter((blockLine) => blockLine > 0);
    previousStart = Math.max(previousStart + 1, blockLines.length ? Math.min(...blockLines) : previousStart + 1);
    return previousStart;
  });
}

function getPartIndexForLine(starts: number[], line: number) {
  let selectedIndex = 0;
  starts.forEach((start, index) => {
    if (start <= line) selectedIndex = index;
  });
  return selectedIndex;
}

export default function WorkoutDescriptionEditor({
  description,
  onChange,
  title,
}: {
  description: string;
  onChange: (description: string) => void;
  title: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [mobileTab, setMobileTab] = useState<EditorTab>('write');
  const [previousDescription, setPreviousDescription] = useState<string | null>(null);
  const [cursorLine, setCursorLine] = useState(1);
  const [timerPanelPartIndex, setTimerPanelPartIndex] = useState<number | null>(null);
  const parsed = useMemo(() => parseWorkout(description), [description]);
  const isPureNotation = /^\s*#(?!#)\s/m.test(description);
  const lines = description.split('\n');
  const partStarts = getPartStarts(description, parsed.parts);
  const selectedPreviewPartIndex = parsed.parts.length
    ? getPartIndexForLine(partStarts, cursorLine)
    : 0;
  const previewPart = parsed.parts[selectedPreviewPartIndex];

  const saveTimer = (partIndex: number, timerLine: string) => {
    const updated = writeTimerLine(description, partIndex, timerLine);
    setPreviousDescription(null);
    onChange(updated.description);
    setCursorLine(updated.partLine);
    setTimerPanelPartIndex(null);
  };

  const deleteTimer = (partIndex: number) => {
    const updated = removeTimerLine(description, partIndex);
    if (updated.removed) {
      setPreviousDescription(null);
      onChange(updated.description);
    }
    setTimerPanelPartIndex(null);
  };

  const syncPreviewToCursor = (textarea: HTMLTextAreaElement) => {
    setCursorLine(getCursorLine(textarea));
  };

  const insertSnippet = (snippet: string, selectionStart = snippet.length, selectionEnd = selectionStart) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (mobileTab === 'preview') setMobileTab('write');
    setTimerPanelPartIndex(null);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const isLineMarker = /^(?:#|!)/.test(snippet);
    let insertAt = start;
    let insertedText = snippet;
    if (isLineMarker) {
      const lineStart = description.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
      const lineEnd = description.indexOf('\n', start);
      const lineText = description.slice(lineStart, lineEnd < 0 ? description.length : lineEnd);
      if (lineText.trim()) {
        insertAt = lineEnd < 0 ? description.length : lineEnd + 1;
        if (lineEnd < 0) insertedText = `\n${snippet}`;
      } else {
        insertAt = lineStart;
      }
    }
    const nextDescription = `${description.slice(0, insertAt)}${insertedText}${description.slice(isLineMarker ? insertAt : end)}`;
    const selectionOffset = isLineMarker && insertAt === description.length && description.slice(insertAt - 1) !== '\n'
      ? 1
      : 0;
    onChange(nextDescription);
    setPreviousDescription(null);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(insertAt + selectionOffset + selectionStart, insertAt + selectionOffset + selectionEnd);
      syncPreviewToCursor(textarea);
    });
  };

  const jumpToLine = (line: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const lineStart = lines.slice(0, Math.max(0, line - 1)).reduce((total, value) => total + value.length + 1, 0);
    const lineEnd = lineStart + (lines[line - 1]?.length || 0);
    textarea.focus();
    textarea.setSelectionRange(lineStart, lineEnd);
    textarea.scrollTop = Math.max(0, (line - 1) * 24);
    setCursorLine(line);
  };

  const convertDescription = () => {
    setPreviousDescription(description);
    setTimerPanelPartIndex(null);
    onChange(convertLegacyWorkoutToNotation(description));
  };

  const handleDescriptionChange = (value: string) => {
    setPreviousDescription(null);
    setTimerPanelPartIndex(null);
    onChange(value);
  };

  return (
    <section aria-label="Workout description editor">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor="workout-description" className="text-sm font-bold text-ink">Description</label>
        <div className="flex items-center gap-2">
          {previousDescription !== null ? (
            <button
              type="button"
              onClick={() => {
                onChange(previousDescription);
                setPreviousDescription(null);
              }}
              className="min-h-9 rounded-sm border border-ink px-2.5 text-[13px] font-bold text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15"
            >
              Undo conversion
            </button>
          ) : !isPureNotation && description.trim() ? (
            <button
              type="button"
              onClick={convertDescription}
              className="min-h-9 rounded-sm border border-ink px-2.5 text-[13px] font-bold text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15"
            >
              Convert to PURE notation
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {[
          { label: '+ Part', snippet: '# Name | 15\n', selectionStart: 2, selectionEnd: 6 },
          { label: '+ Section', snippet: '## ' },
          { label: '+ Note', snippet: '! ' },
          { label: '@ Load', snippet: ' @ Load', selectionStart: 3, selectionEnd: 7 },
          { label: '/ Alt', snippet: ' / Alt', selectionStart: 3, selectionEnd: 6 },
        ].map(({ label, snippet, selectionStart, selectionEnd }) => (
          <button
            key={label}
            type="button"
            onClick={() => insertSnippet(snippet, selectionStart, selectionEnd)}
            className="min-h-9 rounded-sm border border-line bg-paper px-2.5 text-[13px] font-bold text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-2 rounded-sm border border-line bg-canvas p-1 md:hidden" role="tablist" aria-label="Editor view">
        {([
          ['write', 'Write'],
          ['preview', 'Preview'],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mobileTab === tab}
            onClick={() => setMobileTab(tab)}
            className={`min-h-10 rounded-sm text-sm font-bold ${mobileTab === tab ? 'bg-paper text-ink shadow-sm' : 'text-ink-2'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-5 md:grid-cols-2">
        <div className={`min-w-0 ${mobileTab === 'write' ? '' : 'hidden md:block'}`}>
          <div className="overflow-hidden rounded-sm border border-line bg-paper focus-within:border-ink focus-within:ring-[3px] focus-within:ring-ink/15">
            <div className="flex max-h-[34rem] min-h-72 overflow-hidden">
              <div
                ref={lineNumbersRef}
                aria-hidden="true"
                className="w-12 shrink-0 overflow-hidden border-r border-line-2 bg-canvas px-2 pt-2 text-right font-mono text-base leading-6 text-ink-2 select-none"
              >
                {lines.map((_, index) => <div key={index}>{index + 1}</div>)}
              </div>
              <textarea
                ref={textareaRef}
                id="workout-description"
                value={description}
                onChange={(event) => {
                  handleDescriptionChange(event.target.value);
                  syncPreviewToCursor(event.currentTarget);
                }}
                onClick={(event) => syncPreviewToCursor(event.currentTarget)}
                onKeyUp={(event) => syncPreviewToCursor(event.currentTarget)}
                onSelect={(event) => syncPreviewToCursor(event.currentTarget)}
                onScroll={(event) => {
                  if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
                }}
                placeholder="Describe the workout, movements, and any notes..."
                rows={12}
                spellCheck={false}
                className="min-h-72 min-w-0 flex-1 resize-y overflow-auto whitespace-pre bg-paper px-3 py-2 font-mono text-base leading-6 text-ink placeholder:text-ink-2 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-3 space-y-1.5" aria-live="polite">
            {parsed.warnings.map((warning, index) => (
              <div key={`${warning.line}-${warning.message}-${index}`} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => jumpToLine(warning.line)}
                  className="text-left text-[13px] leading-snug text-ink-2 underline decoration-ink-2/40 underline-offset-2 hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15"
                >
                  {warning.message.startsWith('Part ')
                    ? warning.message
                    : `Line ${warning.line}: ${warning.message}`}
                </button>
                {/is 'Intervals' but has no timer line/.test(warning.message) && previewPart && (
                  <button
                    type="button"
                    onClick={() => setTimerPanelPartIndex(selectedPreviewPartIndex)}
                    className="min-h-9 shrink-0 rounded-sm border-2 border-ink px-2.5 text-[13px] font-bold text-ink"
                  >
                    Add timer
                  </button>
                )}
              </div>
            ))}
          </div>

          <details className="mt-4 rounded-sm border border-line bg-paper">
            <summary className="cursor-pointer px-3 py-2.5 text-sm font-bold text-ink underline decoration-line underline-offset-2">
              Cheat sheet
            </summary>
            <div className="border-t border-line-2 p-3 text-[13px] leading-relaxed text-ink-2">
              <p><code># Name | 15 | AMRAP | Team of 3</code> starts a part and sets optional minutes, format, and team.</p>
              <p className="mt-1"><code>## Then</code> adds a section; <code>&gt; instruction</code> adds a sub-header; <code>! repeat</code> adds a note.</p>
              <p className="mt-1"><code>3 Rounds</code> is a scheme. <code>12 Wall Balls @ 20/14 kg / 10 Wall Balls</code> is reps, movement, load, and an alternative.</p>
            </div>
          </details>
        </div>

        <div className={`min-w-0 ${mobileTab === 'preview' ? '' : 'hidden md:block'}`}>
          <div className="relative z-20 mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink">Live board preview</p>
            <div className="flex items-center gap-2">
              {parsed.parts.length > 1 && (
                <div className="flex items-center gap-1" aria-label="Preview workout part">
                  {parsed.parts.map((part, index) => (
                    <button
                      key={`${part.title}-${index}`}
                      type="button"
                      aria-label={`Preview part ${index + 1}: ${part.title}`}
                      aria-pressed={selectedPreviewPartIndex === index}
                      onClick={() => {
                        setCursorLine(partStarts[index] || 1);
                        setTimerPanelPartIndex(null);
                      }}
                      className={`min-h-8 min-w-8 rounded-sm px-2 text-[13px] font-bold ${selectedPreviewPartIndex === index ? 'bg-lime text-ink' : 'border border-line bg-paper text-ink-2'}`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              )}
              {previewPart && (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={timerPanelPartIndex === selectedPreviewPartIndex}
                  onClick={() => setTimerPanelPartIndex((current) =>
                    current === selectedPreviewPartIndex ? null : selectedPreviewPartIndex
                  )}
                  className={`min-h-9 rounded-sm border px-3 text-[13px] font-bold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15 ${
                    previewPart.timer
                      ? 'border-ink bg-ink text-white'
                      : 'border-line bg-paper text-ink hover:bg-canvas'
                  }`}
                >
                  ⏱ Timer
                </button>
              )}
            </div>
            {timerPanelPartIndex !== null && parsed.parts[timerPanelPartIndex] && (
              <IntervalTimerSetup
                key={`${timerPanelPartIndex}-${parsed.parts[timerPanelPartIndex].timer ? serializeTimer(parsed.parts[timerPanelPartIndex].timer!) : 'none'}`}
                partIndex={timerPanelPartIndex}
                partTitle={parsed.parts[timerPanelPartIndex].title}
                timer={parsed.parts[timerPanelPartIndex].timer}
                hasTimerLine={hasTimerLine(description, timerPanelPartIndex)}
                onClose={() => setTimerPanelPartIndex(null)}
                onSave={(line) => saveTimer(timerPanelPartIndex, line)}
                onRemove={() => deleteTimer(timerPanelPartIndex)}
              />
            )}
          </div>
          <div className="aspect-video max-h-[34rem] overflow-auto rounded-sm border-[6px] border-ink bg-paper">
            {previewPart ? (
              <div
                className="p-6"
                style={{ width: '160%', minHeight: '160%', zoom: 0.625 }}
              >
                <p className="mb-4 font-display text-4xl font-black uppercase text-ink">{title.trim() || 'Workout title'}</p>
                <WorkoutPartContent
                  title={previewPart.title}
                  minutes={previewPart.minutes}
                  blocks={previewPart.blocks}
                  compact
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-2">
                Start typing a workout description to preview the board.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
