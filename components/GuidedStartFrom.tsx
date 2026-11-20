'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { GUIDED_TEMPLATES } from '@/lib/workoutGuidedTemplates';
import { summarizePastWorkouts, type PastWorkoutSummary } from '@/lib/pastWorkoutInsights';
import { convertLegacyWorkoutToNotation } from '@/lib/workoutNotation';
import { toModel, type Part } from '@/lib/workoutModel';

type PickerKind = 'template' | 'copy' | 'paste' | null;

function Popover({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-[10vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-label={title} className="max-h-[75vh] w-full max-w-lg overflow-y-auto rounded-lg border border-line bg-paper p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-bold text-ink">{title}</p>
          <button type="button" aria-label="Close" onClick={onClose} className="min-h-9 min-w-9 rounded-sm text-ink-2 hover:bg-canvas">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function GuidedStartFrom({
  onApplyParts,
  onApplyTitle,
}: {
  onApplyParts: (parts: Part[]) => void;
  onApplyTitle?: (title: string) => void;
}) {
  const [open, setOpen] = useState<PickerKind>(null);
  const [pastWorkouts, setPastWorkouts] = useState<PastWorkoutSummary[] | null>(null);
  const [pastLoadError, setPastLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [pasteText, setPasteText] = useState('');

  function openCopyPicker() {
    setOpen('copy');
    if (pastWorkouts !== null) return;
    fetch('/api/workouts/all')
      .then((res) => {
        if (!res.ok) throw new Error('Could not load past workouts');
        return res.json();
      })
      .then((data) => setPastWorkouts(data.workouts || []))
      .catch(() => setPastLoadError('Could not load past workouts. Try again later.'));
  }

  const visiblePastWorkouts = (pastWorkouts || []).filter((w) =>
    w.title.toLowerCase().includes(search.trim().toLowerCase())
  );
  const pastWorkoutRows = summarizePastWorkouts(visiblePastWorkouts.slice(0, 50));

  function applyTemplate(parts: Part[]) {
    // Deep-clone so picking the same template twice never shares object references.
    onApplyParts(JSON.parse(JSON.stringify(parts)));
    setOpen(null);
  }

  function copyPastWorkout(workout: PastWorkoutSummary) {
    const model = convertLegacyWorkoutToNotationToParts(workout.description || '');
    onApplyTitle?.(workout.title);
    onApplyParts(model);
    setOpen(null);
  }

  function convertPastedText() {
    const parts = convertLegacyWorkoutToNotationToParts(pasteText);
    onApplyParts(parts);
    setOpen(null);
    setPasteText('');
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-paper p-3">
        <span className="mr-1 text-[13px] font-bold uppercase tracking-[.1em] text-ink-2">Start from</span>
        <button type="button" onClick={() => setOpen('template')} className="min-h-9 rounded-sm border border-line bg-paper px-3 text-sm font-bold text-ink hover:bg-canvas">
          📋 A template
        </button>
        <button type="button" onClick={openCopyPicker} className="min-h-9 rounded-sm border border-line bg-paper px-3 text-sm font-bold text-ink hover:bg-canvas">
          📄 Copy a past workout
        </button>
        <button type="button" onClick={() => setOpen('paste')} className="min-h-9 rounded-sm border border-line bg-paper px-3 text-sm font-bold text-ink hover:bg-canvas">
          📝 Paste text (WhatsApp, ChatGPT…)
        </button>
        <span className="text-sm text-ink-2">or fill in the parts below</span>
      </div>

      {open === 'template' && (
        <Popover title="Start from a template" onClose={() => setOpen(null)}>
          <div className="space-y-2">
            {GUIDED_TEMPLATES.map((template) => (
              <button
                key={template.name}
                type="button"
                onClick={() => applyTemplate(template.parts)}
                className="block w-full rounded-sm border border-line bg-canvas p-3 text-left hover:border-ink"
              >
                <span className="block font-bold text-ink">{template.name}</span>
                <span className="block text-[13px] text-ink-2">{template.description}</span>
              </button>
            ))}
          </div>
        </Popover>
      )}

      {open === 'copy' && (
        <Popover title="Copy a past workout" onClose={() => setOpen(null)}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title"
            className="mb-3 min-h-11 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink focus:border-ink focus:outline-none"
          />
          {pastLoadError ? (
            <p className="text-sm text-ink-2">{pastLoadError}</p>
          ) : pastWorkouts === null ? (
            <p className="text-sm text-ink-2">Loading past workouts…</p>
          ) : pastWorkoutRows.length === 0 ? (
            <p className="text-sm text-ink-2">No past workouts match.</p>
          ) : (
            <div className="space-y-1">
              {pastWorkoutRows.map((row) => {
                const workout = visiblePastWorkouts.find((w) => w.id === row.id)!;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => copyPastWorkout(workout)}
                    className="block w-full rounded-sm border border-line bg-canvas p-3 text-left hover:border-ink"
                  >
                    <span className="block font-bold text-ink">{row.title}</span>
                    <span className="block text-[13px] text-ink-2">
                      {new Date(row.date).toLocaleDateString()}{row.formats ? ` · ${row.formats}` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Popover>
      )}

      {open === 'paste' && (
        <Popover title="Paste text" onClose={() => setOpen(null)}>
          <p className="mb-2 text-sm text-ink-2">
            Paste a workout from WhatsApp, ChatGPT, or anywhere else. We&apos;ll do our best to turn it into parts and rows — anything we can&apos;t make sense of shows up as a plain text row, so nothing is lost.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={10}
            placeholder={'e.g.\nAMRAP 20 min\n10 Wall Balls\n10 Burpees'}
            className="mb-3 w-full resize-y rounded-sm border border-line bg-paper px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none"
          />
          <Button type="button" onClick={convertPastedText} disabled={!pasteText.trim()}>
            Convert
          </Button>
        </Popover>
      )}
    </>
  );
}

function convertLegacyWorkoutToNotationToParts(description: string): Part[] {
  const hasHeader = description.split(/\r?\n/).some((line) => /^#(?!#)\s*/.test(line.trim()));
  const notation = hasHeader ? description : convertLegacyWorkoutToNotation(description);
  return toModel(notation).parts;
}
