'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Avatar, Loading } from '@/components/ui';
import type { Guest, WorkoutWithDetails } from '@/lib/types';
import { parseWorkoutDescription } from '@/lib/workout-description';

type BoardWorkout = WorkoutWithDetails & { guests: Guest[] };
type TextScale = 1 | 1.25 | 1.5;

const TEXT_SCALES: TextScale[] = [1, 1.25, 1.5];
const DEFAULT_PART_TITLES = ['Warm-up', 'Strength', 'WOD'];
const TEXT_SCALE_STORAGE_KEY = 'pure-whiteboard-text-scale';

function getStoredTextScale(): TextScale {
  if (typeof window === 'undefined') return 1;
  try {
    const savedScale = Number(localStorage.getItem(TEXT_SCALE_STORAGE_KEY));
    return TEXT_SCALES.includes(savedScale as TextScale) ? savedScale as TextScale : 1;
  } catch (storageError) {
    console.warn('Could not read whiteboard text size preference:', storageError);
    return 1;
  }
}

function getMovementPresentation(movement: string) {
  const noteMatch = movement.match(/\(([^)]+)\)\s*$/);
  return {
    name: noteMatch ? movement.slice(0, noteMatch.index).trim() : movement,
    note: noteMatch?.[1] || '',
  };
}

export default function WorkoutBoardPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const workoutId = params.id;
  const [workout, setWorkout] = useState<BoardWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePart, setActivePart] = useState(0);
  const [textScale, setTextScale] = useState<TextScale>(1);
  const [textScaleLoaded, setTextScaleLoaded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [round, setRound] = useState(1);
  const tvMode = searchParams.get('tv') === '1';
  const [tvDarkMode, setTvDarkMode] = useState(true);
  const [tvCursorHidden, setTvCursorHidden] = useState(false);
  const elapsedSecondsRef = useRef(0);
  const touchStartX = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

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
    () => workout ? parseWorkoutDescription(workout.description || '') : [],
    [workout]
  );
  const part = parts[activePart] || parts[0];
  const durationSeconds = (part?.durationMinutes || 0) * 60;

  useEffect(() => {
    if (!timerRunning) return;
    const intervalId = window.setInterval(() => {
      const nextElapsedSeconds = elapsedSecondsRef.current + 1;
      if (tvMode && durationSeconds > 0 && nextElapsedSeconds >= durationSeconds) {
        if (activePart + 1 < parts.length) {
          elapsedSecondsRef.current = 0;
          setElapsedSeconds(0);
          setActivePart(activePart + 1);
        } else {
          elapsedSecondsRef.current = durationSeconds;
          setElapsedSeconds(durationSeconds);
          setTimerRunning(false);
        }
        return;
      }
      elapsedSecondsRef.current = nextElapsedSeconds;
      setElapsedSeconds(nextElapsedSeconds);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [activePart, durationSeconds, parts.length, timerRunning, tvMode]);

  useEffect(() => {
    if (!tvMode) return;
    let timeoutId = 0;
    const showCursor = () => {
      setTvCursorHidden(false);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setTvCursorHidden(true), 3000);
    };
    timeoutId = window.setTimeout(() => setTvCursorHidden(true), 3000);
    window.addEventListener('mousemove', showCursor);
    window.addEventListener('keydown', showCursor);
    window.addEventListener('touchstart', showCursor);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('mousemove', showCursor);
      window.removeEventListener('keydown', showCursor);
      window.removeEventListener('touchstart', showCursor);
    };
  }, [tvMode]);

  useEffect(() => {
    let active = true;
    const requestWakeLock = async () => {
      if (!('wakeLock' in navigator) || !navigator.wakeLock) return;
      if (wakeLockRef.current && !wakeLockRef.current.released) return;
      try {
        const wakeLock = await navigator.wakeLock.request('screen');
        if (!active) {
          await wakeLock.release();
          return;
        }
        wakeLockRef.current = wakeLock;
      } catch (wakeError) {
        if (active) console.warn('Screen Wake Lock is unavailable:', wakeError);
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void requestWakeLock();
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (wakeLockRef.current) {
        void wakeLockRef.current.release().catch((wakeError) => {
          console.warn('Could not release Screen Wake Lock:', wakeError);
        });
        wakeLockRef.current = null;
      }
    };
  }, []);

  const timerSeconds = durationSeconds > 0
    ? Math.max(0, durationSeconds - elapsedSeconds)
    : elapsedSeconds;
  const timerLabel = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(timerSeconds % 60).padStart(2, '0')}`;
  const teamNames = [
    ...(workout?.participants || []).map((participant) => participant.user_name),
    ...(workout?.guests || []).map((guest) => guest.name),
  ];

  const changePart = useCallback((index: number) => {
    if (index < 0 || index >= parts.length) return;
    setActivePart(index);
    elapsedSecondsRef.current = 0;
    setElapsedSeconds(0);
    setTimerRunning(false);
  }, [parts.length]);

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

  const date = parseISO(workout.date);
  const nextScale = TEXT_SCALES[(TEXT_SCALES.indexOf(textScale) + 1) % TEXT_SCALES.length];
  const displayScale = tvMode ? 1.5 : textScale;
  const darkBoard = tvMode && tvDarkMode;
  const asideTheme = darkBoard ? 'bg-[#141512] text-white' : tvMode ? 'bg-canvas text-ink' : 'bg-ink text-white';
  const asideText = tvMode && !tvDarkMode ? 'text-ink' : 'text-white';
  const asideBorder = tvMode && !tvDarkMode ? 'border-line' : 'border-white/30';
  const asideHover = tvMode && !tvDarkMode ? 'hover:bg-white' : 'hover:bg-white/10';
  const partTitle = part?.title || 'Workout';
  const partDisplayTitle = part?.durationMinutes
    ? `${partTitle} — ${part.durationMinutes}′`
    : partTitle;

  return (
    <main
      className={`flex min-h-screen flex-col ${darkBoard ? 'bg-ink text-white' : 'bg-paper text-ink'} ${tvMode && tvCursorHidden ? 'cursor-none' : ''}`}
      style={{ fontSize: `${16 * displayScale}px` }}
    >
      <div className="h-2 shrink-0 bg-lime" />
      <header className={`flex flex-wrap items-center justify-between gap-3 border-b-2 px-4 py-3 md:px-7 ${darkBoard ? 'border-white/20' : 'border-ink'}`}>
        <Link href="/dashboard" className={`font-display text-[1.5em] font-extrabold uppercase ${darkBoard ? 'text-white' : 'text-ink'}`} aria-label="PURE Dashboard">PURE</Link>
        <div className={`flex flex-1 items-center justify-center text-center font-bold uppercase tabular-nums ${darkBoard ? 'text-white' : 'text-ink'}`}>
          {format(date, 'EEE dd MMM')} · {format(date, 'HH:mm')} · Team of {workout.max_participants}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {tvMode ? (
            <button
              type="button"
              onClick={() => setTvDarkMode((dark) => !dark)}
              className={`inline-flex min-h-11 items-center justify-center rounded-sm border px-3 font-bold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-lime/40 ${darkBoard ? 'border-white/30 text-white hover:bg-white/10' : 'border-line text-ink hover:bg-canvas'}`}
              aria-label={`Switch to ${tvDarkMode ? 'light' : 'dark'} TV theme`}
            >
              {tvDarkMode ? 'Light mode' : 'Dark mode'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setTextScale(nextScale)}
                aria-label={`Change text size from ${textScale}x to ${nextScale}x`}
                className="inline-flex min-h-11 items-center justify-center rounded-sm border border-line px-3 font-bold text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15"
              >
                A <span className="ml-1 text-[1.2em]">A+</span>
              </button>
              <Link href={`/workouts/${workout.id}`} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-ink px-4 font-bold text-white hover:bg-ink-2">Exit</Link>
            </>
          )}
        </div>
      </header>

      <section
        className="grid flex-1 grid-cols-1 gap-4 p-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:p-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="min-w-0 overflow-y-auto px-1 py-2 lg:px-3 lg:py-4">
          <p className={`mb-3 font-bold uppercase tracking-[.14em] ${darkBoard ? 'text-white' : 'text-ink-2'}`}>
            Part {String(activePart + 1).padStart(2, '0')} of {String(parts.length).padStart(2, '0')}
          </p>
          <h1
            className={`mb-5 font-display font-extrabold uppercase leading-[.9] ${darkBoard ? 'text-white' : 'text-ink'}`}
            style={{ fontSize: `clamp(${44 * displayScale}px, ${7 * displayScale}vw, ${84 * displayScale}px)` }}
          >
            {partDisplayTitle}
          </h1>

          <div className={`divide-y-2 ${darkBoard ? 'divide-white/20' : 'divide-line-2'}`}>
            {(part?.movements.length ? part.movements : [{ reps: null, movement: 'No movements listed' }]).map((movement, index) => {
              const presentation = getMovementPresentation(movement.movement);
              return (
                <div key={`${movement.movement}-${index}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-4 md:gap-5 md:py-5">
                  <span className={`min-w-[1.7em] font-display text-[4em] font-extrabold leading-none tabular-nums ${darkBoard ? 'text-white' : 'text-ink'}`}>
                    {movement.reps || '—'}
                  </span>
                  <span
                    className={`min-w-0 font-sans font-bold leading-tight ${darkBoard ? 'text-white' : 'text-ink'}`}
                    style={{ fontSize: `clamp(${24 * displayScale}px, ${3.2 * displayScale}vw, ${40 * displayScale}px)` }}
                  >
                    {presentation.name}
                  </span>
                  {presentation.note && (
                    <span className={`max-w-[6em] text-right font-sans text-[1.5em] font-semibold leading-tight ${darkBoard ? 'text-white' : 'text-ink-2'}`}>
                      {presentation.note}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <aside className={`flex flex-col gap-5 rounded-xl p-5 md:p-6 ${asideTheme}`}>
          <button
            type="button"
            onClick={() => setTimerRunning((running) => !running)}
            aria-label={timerRunning ? 'Pause timer' : durationSeconds > 0 ? 'Start countdown timer' : 'Start stopwatch'}
            className="flex min-h-40 flex-col items-center justify-center rounded-lg text-lime focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-lime/40"
          >
            <span className="font-display text-[7.5em] font-extrabold leading-none tabular-nums">{timerLabel}</span>
            <span className={`mt-2 font-bold uppercase tracking-[.14em] ${asideText}`}>{timerRunning ? 'Tap to pause' : 'Tap to start'}</span>
          </button>

          <div>
            <p className={`mb-2 text-center font-bold uppercase tracking-[.14em] ${asideText}`}>Round</p>
            <div className="flex items-center justify-center gap-4">
              <button type="button" onClick={() => setRound((value) => Math.max(0, value - 1))} aria-label="Decrease round" className={`inline-flex h-16 w-16 items-center justify-center rounded-sm border ${asideBorder} text-[2em] font-bold ${asideText} ${asideHover}`}>−</button>
              <span className={`min-w-14 text-center font-display text-[4em] font-extrabold leading-none tabular-nums ${asideText}`}>{round}</span>
              <button type="button" onClick={() => setRound((value) => value + 1)} aria-label="Increase round" className="inline-flex h-16 w-16 items-center justify-center rounded-sm bg-lime text-[2em] font-bold text-ink hover:brightness-95">+</button>
            </div>
          </div>

          <div className={`min-h-0 border-t pt-4 ${tvMode && !tvDarkMode ? 'border-line' : 'border-white/20'}`}>
            <p className={`mb-3 font-bold uppercase tracking-[.14em] ${asideText}`}>Team · {teamNames.length || workout.max_participants}</p>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {teamNames.length ? teamNames.map((name, index) => (
                <div key={`${name}-${index}`} className="flex items-center gap-3">
                  <Avatar initials={name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()} className="h-9 w-9 bg-white text-ink" />
                  <span className={`font-semibold ${asideText}`}>{name}</span>
                </div>
              )) : (
                <p className={`text-[.9em] ${asideText}`}>No team members registered yet.</p>
              )}
            </div>
          </div>
        </aside>
      </section>

      <nav className={`grid shrink-0 grid-cols-3 gap-2 border-t p-3 md:gap-3 md:px-6 md:py-4 ${darkBoard ? 'border-white/20 bg-ink' : 'border-line bg-paper'}`} aria-label="Workout parts">
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
                selected ? 'bg-lime text-ink' : darkBoard ? 'border border-white/30 text-white hover:bg-white/10' : 'border border-line text-ink-2 hover:bg-canvas'
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
