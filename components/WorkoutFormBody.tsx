'use client';

/**
 * v9 Phase 5 — the shared body of Create and Edit workout, so both pages
 * are the same page in substance: same Basics row, same editor, same
 * phone flow, same footer. Each page still owns its own data loading and
 * submit request (they differ: POST a new workout vs. PUT an existing
 * one), and supplies whatever belongs in "More options" — attendee
 * pre-select for Create, participant management for Edit — as a slot.
 *
 * Create passes `showStartScreen`; Edit doesn't, since there's no "start"
 * to show — a workout already exists to edit.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Card, Button, ErrorMessage } from '@/components/ui';
import PasteFirstWorkoutEditor from '@/components/PasteFirstWorkoutEditor';
import { classifyLines } from '@/lib/classifyLines';
import { cleanPastedText } from '@/lib/pasteCleanup';

export default function WorkoutFormBody({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  date,
  onDateChange,
  time,
  onTimeChange,
  maxParticipants,
  onMaxParticipantsChange,
  onSubmit,
  loading,
  submitLabel,
  loadingLabel,
  onCancel,
  showStartScreen = false,
  moreOptions,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  time: string;
  onTimeChange: (value: string) => void;
  maxParticipants: string;
  onMaxParticipantsChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  submitLabel: string;
  loadingLabel: string;
  onCancel: () => void;
  /** Create has a dedicated phone start screen (Type it now / Paste / Copy an old workout); Edit goes straight to the editor. */
  showStartScreen?: boolean;
  /** Attendee pre-select (Create) or participant management (Edit), shown in the same collapsed "More options". */
  moreOptions: React.ReactNode;
}) {
  const [mobileStep, setMobileStep] = useState<'start' | 'editor'>(showStartScreen ? 'start' : 'editor');
  const [mobileTab, setMobileTab] = useState<'text' | 'preview'>('text');
  const [pasteError, setPasteError] = useState('');

  const checkCount = classifyLines(description).filter((c) => c.kind === 'check').length;

  const handlePasteFromClipboard = async () => {
    setPasteError('');
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setPasteError('Your clipboard is empty.');
        return;
      }
      onDescriptionChange(cleanPastedText(text));
      setMobileTab('preview');
      setMobileStep('editor');
    } catch {
      setPasteError("Couldn't read your clipboard. Copy the workout text first, then try again.");
    }
  };

  const checkMessage = checkCount > 0 && (
    <p className="w-full text-[13px] text-ink-2">
      {checkCount} line{checkCount === 1 ? '' : 's'} in the workout text may need a look — you can still {submitLabel.toLowerCase()} it.
    </p>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Phone flow: a dedicated start screen (Create only), then a single
          Text|Preview tab with a bottom-sheet ✎ Edit and a sticky Save bar —
          replacing the desktop two-column layout, which doesn't fit a phone screen. */}
      <div className="md:hidden">
        {mobileStep === 'start' ? (
          <Card className="space-y-5">
            <div>
              <label htmlFor="workout-title-m" className="mb-1.5 block text-sm font-bold text-ink">Title</label>
              <input
                id="workout-title-m"
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="e.g., Monday Morning WOD"
                required
                className="min-h-12 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="min-h-12 flex-1 rounded-sm border border-line bg-paper px-3 py-1.5">
                <span className="block text-[11px] font-bold text-ink-2">Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => onDateChange(e.target.value)}
                  required
                  lang="de-CH"
                  className="w-full bg-transparent text-sm font-semibold text-ink focus:outline-none"
                />
              </label>
              <label className="min-h-12 flex-1 rounded-sm border border-line bg-paper px-3 py-1.5">
                <span className="block text-[11px] font-bold text-ink-2">Time</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => onTimeChange(e.target.value)}
                  required
                  className="w-full bg-transparent text-sm font-semibold text-ink focus:outline-none"
                />
              </label>
              <label className="min-h-12 flex-1 rounded-sm border border-line bg-paper px-3 py-1.5">
                <span className="block text-[11px] font-bold text-ink-2">Max</span>
                <input
                  type="number"
                  min={1}
                  value={maxParticipants}
                  onChange={(e) => onMaxParticipantsChange(e.target.value)}
                  required
                  className="w-full bg-transparent text-sm font-semibold text-ink focus:outline-none"
                />
              </label>
            </div>

            {pasteError && <ErrorMessage message={pasteError} />}

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setMobileStep('editor')}
                className="min-h-[72px] w-full rounded-sm border-2 border-ink bg-paper text-left px-4 text-base font-bold text-ink hover:bg-canvas"
              >
                ✎ Type it now
              </button>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="min-h-[72px] w-full rounded-sm bg-lime text-left px-4 text-base font-bold text-ink hover:opacity-90"
              >
                📋 Paste from WhatsApp
              </button>
              <Link href="/archive" className="block">
                <span className="flex min-h-[72px] w-full items-center rounded-sm border border-line bg-paper px-4 text-base font-bold text-ink hover:bg-canvas">
                  ⧉ Copy an old workout
                </span>
              </Link>
            </div>
          </Card>
        ) : (
          <div>
            {showStartScreen && (
              <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-2 border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur-sm">
                <button type="button" onClick={() => setMobileStep('start')} className="min-h-10 shrink-0 text-sm font-bold text-ink">
                  ‹ Back
                </button>
                <p className="min-w-0 truncate text-sm font-bold text-ink" style={{ hyphens: 'none' }}>
                  {title || 'Untitled workout'}
                </p>
                <span className="w-10 shrink-0" aria-hidden="true" />
              </div>
            )}

            <div className="mt-3 flex rounded-sm border border-line bg-paper p-1">
              <button
                type="button"
                onClick={() => setMobileTab('text')}
                className={`min-h-9 flex-1 rounded-sm text-sm font-bold ${mobileTab === 'text' ? 'bg-ink text-lime' : 'text-ink'}`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('preview')}
                className={`min-h-9 flex-1 rounded-sm text-sm font-bold ${mobileTab === 'preview' ? 'bg-ink text-lime' : 'text-ink'}`}
              >
                Preview
              </button>
            </div>

            <div className="mt-3">
              <PasteFirstWorkoutEditor
                title={title}
                description={description}
                onDescriptionChange={onDescriptionChange}
                onTitleChange={onTitleChange}
                mobileView={mobileTab}
                useBottomSheetForEdit
              />
            </div>

            <div className="mt-4">{moreOptions}</div>

            <div className="sticky bottom-0 z-20 -mx-4 mt-4 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-sm">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? loadingLabel : submitLabel}
              </Button>
              <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              {checkMessage}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Basics row + two-column editor side by side. */}
      <div className="hidden md:block space-y-5">
        <Card className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <label htmlFor="workout-title" className="mb-1.5 block text-sm font-bold text-ink">Title</label>
              <input
                id="workout-title"
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="e.g., Monday Morning WOD"
                required
                className="min-h-12 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
              />
            </div>
            <div>
              <label htmlFor="workout-date" className="mb-1.5 block text-sm font-bold text-ink">Date</label>
              <input
                id="workout-date"
                type="date"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                required
                lang="de-CH"
                className="min-h-12 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
              />
            </div>
            <div>
              <label htmlFor="workout-time" className="mb-1.5 block text-sm font-bold text-ink">Time</label>
              <input
                id="workout-time"
                type="time"
                value={time}
                onChange={(e) => onTimeChange(e.target.value)}
                required
                className="min-h-12 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
              />
            </div>
            <div>
              <label htmlFor="max-participants" className="mb-1.5 block text-sm font-bold text-ink">Max people</label>
              <div className="inline-flex items-center rounded-sm border border-line bg-paper">
                <button
                  type="button"
                  aria-label="Decrease maximum participants"
                  onClick={() => onMaxParticipantsChange(String(Math.max(1, (Number(maxParticipants) || 1) - 1)))}
                  className="h-12 w-12 text-xl font-bold text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15"
                >
                  −
                </button>
                <input
                  id="max-participants"
                  type="number"
                  min={1}
                  step={1}
                  value={maxParticipants}
                  onChange={(e) => onMaxParticipantsChange(e.target.value)}
                  onBlur={() => onMaxParticipantsChange(String(Math.max(1, Number.parseInt(maxParticipants, 10) || 1)))}
                  required
                  className="h-12 w-16 border-x border-line bg-paper text-center text-base font-bold tabular-nums text-ink focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Increase maximum participants"
                  onClick={() => onMaxParticipantsChange(String((Number(maxParticipants) || 1) + 1))}
                  className="h-12 w-12 text-xl font-bold text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div>
            <PasteFirstWorkoutEditor title={title} description={description} onDescriptionChange={onDescriptionChange} onTitleChange={onTitleChange} />
          </div>

          {moreOptions}
        </Card>
        <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-sm">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? loadingLabel : submitLabel}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          {checkMessage}
        </div>
      </div>
    </form>
  );
}
