'use client';

import { useEffect, useState } from 'react';
import { SegmentedControl } from '@/components/ui';
import WorkoutDescriptionEditor from '@/components/WorkoutDescriptionEditor';
import GuidedPartCard from '@/components/GuidedPartCard';
import GuidedLivePreview from '@/components/GuidedLivePreview';
import GuidedStartFrom from '@/components/GuidedStartFrom';
import { toModel, toText, type Part, type WorkoutModel } from '@/lib/workoutModel';
import { convertLegacyWorkoutToNotation, parseWorkout } from '@/lib/workoutNotation';
import { getMovementSuggestions, type PastWorkoutSummary } from '@/lib/pastWorkoutInsights';

/**
 * Maps a raw line's exact text to the notation parser's warning for that line,
 * so a row Simple mode couldn't fully understand can show why (Phase 3).
 */
function warningsByLine(text: string): Map<string, string> {
  const lines = text.split(/\r?\n/);
  const { warnings } = parseWorkout(text);
  const byLine = new Map<string, string>();
  for (const warning of warnings) {
    const line = lines[warning.line - 1]?.trim();
    if (line) byLine.set(line, warning.message);
  }
  return byLine;
}

const MODE_STORAGE_KEY = 'pure.workoutEditor.mode';
type Mode = 'simple' | 'text';

function getStoredMode(): Mode {
  try {
    return localStorage.getItem(MODE_STORAGE_KEY) === 'text' ? 'text' : 'simple';
  } catch {
    return 'simple';
  }
}

function newPart(index: number): Part {
  return {
    title: index === 0 ? 'Warm-up' : 'WOD',
    minutes: '',
    format: 'Other',
    team: '',
    instructions: [],
    items: [],
  };
}

export default function GuidedWorkoutEditor({
  title,
  description,
  onDescriptionChange,
  onTitleChange,
}: {
  title: string;
  description: string;
  onDescriptionChange: (text: string) => void;
  /** Optional: lets "Copy a past workout" (Phase 4) also fill in the title. */
  onTitleChange?: (title: string) => void;
}) {
  // Lazy initial state: reading localStorage only once, on the client, at mount.
  const [mode, setMode] = useState<Mode>(() => getStoredMode());
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [model, setModel] = useState<WorkoutModel>(() => toModel(description));
  const [activePartIndex, setActivePartIndex] = useState(0);
  // Tracks the `description` this component last rendered with, so a prop change coming
  // from outside (a template, the generator, a URL prefill) can be detected and the model
  // re-derived during render — the pattern React recommends for "adjusting state when a
  // prop changes" — without an effect that would call setState synchronously after the
  // fact. commitModel sets this to the text it just emitted, so our own round trip back
  // through the parent's `description` prop is recognized and doesn't re-derive the model.
  const [lastSeenDescription, setLastSeenDescription] = useState(description);
  const [movementSuggestions, setMovementSuggestions] = useState<ReturnType<typeof getMovementSuggestions>>([]);

  if (description !== lastSeenDescription) {
    setLastSeenDescription(description);
    setModel(toModel(description));
    setActivePartIndex(0);
  }

  useEffect(() => {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      // Ignore storage errors (private browsing, quota, etc.) — the toggle still works this session.
    }
  }, [mode]);

  // Movement name/weight/easier-option autocomplete (Phase 4), from the same public,
  // already-existing endpoint "Copy a past workout" uses. Best-effort: silently skipped
  // if it fails, since autocomplete is a convenience, not something the editor depends on.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/workouts/all')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { workouts?: PastWorkoutSummary[] }) => {
        if (!cancelled) setMovementSuggestions(getMovementSuggestions(data.workouts || []));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function applyParts(parts: Part[]) {
    commitModel({ ...model, parts });
    setActivePartIndex(0);
  }

  function convertCurrentFreeText() {
    applyParts(toModel(convertLegacyWorkoutToNotation(description)).parts);
  }

  function commitModel(next: WorkoutModel) {
    setModel(next);
    const text = toText(next);
    setLastSeenDescription(text);
    onDescriptionChange(text);
  }

  function updatePart(index: number, next: Part) {
    const parts = model.parts.slice();
    parts[index] = next;
    commitModel({ ...model, parts });
  }

  function removePart(index: number) {
    const parts = model.parts.slice();
    parts.splice(index, 1);
    commitModel({ ...model, parts });
    setActivePartIndex((current) => Math.max(0, Math.min(current, parts.length - 1)));
  }

  function movePart(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= model.parts.length) return;
    const parts = model.parts.slice();
    [parts[index], parts[target]] = [parts[target], parts[index]];
    commitModel({ ...model, parts });
    if (activePartIndex === index) setActivePartIndex(target);
    else if (activePartIndex === target) setActivePartIndex(index);
  }

  function addPart() {
    const parts = [...model.parts, newPart(model.parts.length)];
    commitModel({ ...model, parts });
    setActivePartIndex(parts.length - 1);
  }

  const previewText = toText(model);
  const warnings = warningsByLine(previewText);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink">Workout</p>
        <SegmentedControl
          items={[{ label: 'Simple', value: 'simple' }, { label: 'Text', value: 'text' }]}
          value={mode}
          onChange={setMode}
          ariaLabel="Editing mode"
        />
      </div>

      <GuidedStartFrom onApplyParts={applyParts} onApplyTitle={onTitleChange} />

      {mode === 'text' ? (
        <WorkoutDescriptionEditor description={description} onChange={onDescriptionChange} title={title} />
      ) : (
        <>
          <div className="mb-4 md:hidden">
            <SegmentedControl
              items={[{ label: 'Edit', value: 'edit' }, { label: 'Preview', value: 'preview' }]}
              value={mobileTab}
              onChange={setMobileTab}
              ariaLabel="Edit or preview"
              className="w-full"
            />
          </div>
          <div className="grid gap-6 md:grid-cols-[1fr_360px]">
            <div className={`space-y-4 ${mobileTab === 'preview' ? 'hidden md:block' : ''}`}>
              {model.parts.length === 0 && model.preamble.length > 0 && (
                <div className="rounded-lg border border-line bg-canvas p-4 text-sm text-ink-2">
                  <p className="mb-2">This workout was written as free text, so Simple mode can&apos;t show parts and rows for it yet.</p>
                  <button
                    type="button"
                    onClick={convertCurrentFreeText}
                    className="min-h-9 rounded-sm border border-line bg-paper px-3 text-sm font-bold text-ink hover:bg-canvas"
                  >
                    Convert this workout to parts
                  </button>
                </div>
              )}
              {model.parts.map((part, index) => (
                <GuidedPartCard
                  key={index}
                  part={part}
                  index={index}
                  total={model.parts.length}
                  isPreviewing={index === activePartIndex}
                  onChange={(next) => updatePart(index, next)}
                  onRemove={() => removePart(index)}
                  onMove={(direction) => movePart(index, direction)}
                  onPreview={() => setActivePartIndex(index)}
                  warnings={warnings}
                  movementSuggestions={movementSuggestions}
                />
              ))}
              <button
                type="button"
                onClick={addPart}
                className="min-h-14 w-full rounded-[14px] border-2 border-dashed border-line bg-transparent text-sm font-bold text-ink-2 hover:border-ink hover:text-ink"
              >
                + Add part (e.g. Strength, WOD, Cool-down)
              </button>
            </div>
            <div className={mobileTab === 'edit' ? 'hidden md:block' : ''}>
              <GuidedLivePreview
                title={title}
                description={previewText}
                activeIndex={Math.min(activePartIndex, Math.max(0, model.parts.length - 1))}
                onSelectPart={setActivePartIndex}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
