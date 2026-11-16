'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Avatar, Loading } from '@/components/ui';
import TimerPanel from '@/components/TimerPanel';
import WorkoutPartContent from '@/components/WorkoutPartContent';
import WorkoutTvBoard from '@/components/WorkoutTvBoard';
import type { Guest, WorkoutWithDetails } from '@/lib/types';
import { pauseStoredIntervalTimer } from '@/lib/intervalTimerPersistence';
import { parseWorkout, type WorkoutPart } from '@/lib/workoutNotation';

type BoardWorkout = WorkoutWithDetails & { guests: Guest[] };
type TextScale = 1.5 | 1.75 | 2;

const TEXT_SCALES: TextScale[] = [1.5, 1.75, 2];
const DEFAULT_PART_TITLES = ['Warm-up', 'Strength', 'WOD'];
const TEXT_SCALE_STORAGE_KEY = 'pure-whiteboard-text-scale';

function getStoredTextScale(): TextScale {
  if (typeof window === 'undefined') return 1.5;
  try {
    const savedScale = Number(localStorage.getItem(TEXT_SCALE_STORAGE_KEY));
    return TEXT_SCALES.includes(savedScale as TextScale) ? savedScale as TextScale : 1.5;
  } catch (storageError) {
    console.warn('Could not read whiteboard text size preference:', storageError);
    return 1.5;
  }
}

export default function WorkoutBoardPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const workoutId = params.id;
  const [workout, setWorkout] = useState<BoardWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePart, setActivePart] = useState(0);
  const [textScale, setTextScale] = useState<TextScale>(1.5);
  const [textScaleLoaded, setTextScaleLoaded] = useState(false);
  const tvMode = searchParams.get('tv') === '1';
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/workouts/${workoutId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load this workout');
        const data = await response.json();
        if (active) setWorkout(data.workout as BoardWorkout);
      })
      .catch((requestError: unknown) => {
        console.error('Whiteboard workout load error:', requestError);
        if (active) setError('Could not load this workout.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [workoutId]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setTextScale(getStoredTextScale());
      setTextScaleLoaded(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!textScaleLoaded) return;
    try {
      localStorage.setItem(TEXT_SCALE_STORAGE_KEY, String(textScale));
    } catch (storageError) {
      console.warn('Could not save whiteboard text size preference:', storageError);
    }
  }, [textScale, textScaleLoaded]);

  const parts = useMemo(
    () => workout ? parseWorkout(workout.description || '').parts : [],
    [workout]
  );
  const part = parts[activePart] || parts[0];
  const displayPart: WorkoutPart = part || { title: 'Workout', meta: [], blocks: [] };
  const teamNames = [
    ...(workout?.participants || []).map((participant) => participant.user_name),
    ...(workout?.guests || []).map((guest) => guest.name),
  ];

  const changePart = useCallback((index: number) => {
    if (index < 0 || index >= parts.length) return;
    pauseStoredIntervalTimer(workoutId, activePart);
    setActivePart(index);
  }, [activePart, parts.length, workoutId]);
  const advanceIntervalPart = useCallback(() => changePart(activePart + 1), [activePart, changePart]);

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null) return;
    const endX = event.changedTouches[0]?.clientX;
    if (endX === undefined) return;
    const deltaX = endX - startX;
    if (deltaX > 60) changePart(activePart - 1);
    else if (deltaX < -60) changePart(activePart + 1);
  };

  if (loading) return <Loading />;
  if (!workout || error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper p-6 text-center">
        <div>
          <p className="mb-4 text-base font-semibold text-ink-2">{error || 'Workout not found.'}</p>
          <Link href={`/workouts/${workoutId}`} className="inline-flex min-h-11 items-center rounded-sm bg-ink px-4 text-sm font-bold text-white">Exit whiteboard</Link>
        </div>
      </main>
    );
  }

  if (tvMode) return <WorkoutTvBoard workout={workout} />;

  const date = parseISO(workout.date);
  const nextScale = TEXT_SCALES[(TEXT_SCALES.indexOf(textScale) + 1) % TEXT_SCALES.length];
  const displayScale = textScale;

  return (
    <main
      className="flex min-h-screen flex-col bg-paper text-ink"
      style={{ fontSize: '16px' }}
    >
      <div className="h-2 shrink-0 bg-lime" />
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-4 py-3 md:px-7">
        <Link href="/dashboard" className="font-display text-[1.5em] font-extrabold uppercase text-ink" aria-label="PURE Dashboard">PURE</Link>
        <div className="flex flex-1 items-center justify-center text-center font-bold uppercase tabular-nums text-ink">
          {format(date, 'EEE dd MMM')} · {format(date, 'HH:mm')} · Team of {workout.max_participants}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setTextScale(nextScale)}
            aria-label={`Change text size from ${textScale}x to ${nextScale}x`}
            className="inline-flex min-h-11 items-center justify-center rounded-sm border border-line px-3 font-bold text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15"
          >
            A <span className="ml-1 text-[1.2em]">A+</span>
          </button>
          <Link href={`/workouts/${workout.id}`} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-ink px-4 font-bold text-white hover:bg-ink-2">Exit</Link>
        </div>
      </header>

      <section
        className="grid flex-1 grid-cols-1 gap-4 p-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:p-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="min-w-0 overflow-y-auto px-1 py-2 lg:px-3 lg:py-4">
          <WorkoutPartContent
            title={part?.title || 'Workout'}
            minutes={part?.minutes}
            blocks={part?.blocks || []}
            activePart={activePart}
            totalParts={parts.length}
            displayScale={displayScale}
          />
        </div>

        <aside className="flex flex-col gap-5 rounded-xl bg-ink p-5 text-white md:p-6">
          <TimerPanel
            key={`${workout.id}-${activePart}`}
            size="compact"
            workoutId={workout.id}
            partIndex={activePart}
            part={displayPart}
            upcomingPartTitle={parts[activePart + 1]?.title}
            onAutoAdvance={parts[activePart + 1] ? advanceIntervalPart : undefined}
          />

          <div className="min-h-0 border-t border-white/20 pt-4">
            <p className="mb-3 font-bold uppercase tracking-[.14em] text-white">Team · {teamNames.length || workout.max_participants}</p>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {teamNames.length ? teamNames.map((name, index) => (
                <div key={`${name}-${index}`} className="flex items-center gap-3">
                  <Avatar initials={name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()} className="h-9 w-9 bg-white text-ink" />
                  <span className="font-semibold text-white">{name}</span>
                </div>
              )) : (
                <p className="text-[.9em] text-white">No team members registered yet.</p>
              )}
            </div>
          </div>
        </aside>
      </section>

      <nav className="grid shrink-0 grid-cols-3 gap-2 border-t border-line bg-paper p-3 md:gap-3 md:px-6 md:py-4" aria-label="Workout parts">
        {DEFAULT_PART_TITLES.map((defaultTitle, index) => {
          const selected = activePart === index;
          const title = parts[index]?.title || defaultTitle;
          return (
            <button
              key={`${defaultTitle}-${index}`}
              type="button"
              disabled={!parts[index]}
              onClick={() => changePart(index)}
              aria-current={selected ? 'step' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center rounded-sm px-2 py-2 text-center font-bold uppercase disabled:cursor-default disabled:opacity-50 ${
                selected ? 'bg-lime text-ink' : 'border border-line text-ink-2 hover:bg-canvas'
              }`}
            >
              <span className="text-[.85em] tabular-nums">{String(index + 1).padStart(2, '0')}</span>
              <span className="truncate">{title}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}
