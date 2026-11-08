'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { addMinutes, format, parseISO } from 'date-fns';
import Link from 'next/link';
import type { Guest, WorkoutWithDetails } from '@/lib/types';
import type { WorkoutBlock, WorkoutPart } from '@/lib/workoutNotation';
import { parseWorkout } from '@/lib/workoutNotation';

type BoardWorkout = WorkoutWithDetails & { guests: Guest[] };
type PersistedTimerState = {
  activePart: number;
  elapsedSeconds: number;
  timerRunning: boolean;
  savedAt: number;
};

const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;
const TIMER_STORAGE_PREFIX = 'pure-tv-timer:';
const TEXT_SCALE_STORAGE_KEY = 'pure-tv-text-scale';
const TEXT_SCALES = [1, 1.25, 1.5] as const;

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

function getPartGroups(part: WorkoutPart | undefined) {
  const groups: Array<{ title?: string; blocks: WorkoutBlock[] }> = [{ blocks: [] }];
  const notes: WorkoutBlock[] = [];
  const schemes: WorkoutBlock[] = [];

  for (const block of part?.blocks || []) {
    if (block.type === 'section' || block.type === 'sub') {
      if (groups[groups.length - 1].title || groups[groups.length - 1].blocks.length) {
        groups.push({ title: block.name, blocks: [] });
      } else {
        groups[groups.length - 1].title = block.name;
      }
    } else if (block.type === 'note') {
      notes.push(block);
    } else if (block.type === 'scheme') {
      schemes.push(block);
    } else {
      groups[groups.length - 1].blocks.push(block);
    }
  }

  return {
    groups: groups.filter((group) => group.title || group.blocks.length),
    notes,
    schemes,
  };
}

function getStoredTextScale(): number {
  try {
    const stored = Number(localStorage.getItem(TEXT_SCALE_STORAGE_KEY));
    return TEXT_SCALES.includes(stored as (typeof TEXT_SCALES)[number]) ? stored : 1;
  } catch (storageError) {
    console.warn('Could not read TV board text size preference:', storageError);
    return 1;
  }
}

function playTone(frequency = 880, duration = 0.16) {
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
    oscillator.onended = () => { void audio.close(); };
  } catch (audioError) {
    console.warn('Workout timer audio is unavailable:', audioError);
  }
}

function WorkoutTvContent({
  part,
  dark,
  textScale,
}: {
  part: WorkoutPart | undefined;
  dark: boolean;
  textScale: number;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const { groups, notes, schemes } = useMemo(() => getPartGroups(part), [part]);
  const hasDenseSection = groups.some(
    (group) => group.blocks.filter((block) => block.type === 'movement').length > 6
  );
  const repeatNote = notes.some((note) => /\b(?:repeat|again|wieder|beginnt|start again|loop)\b/i.test(note.name));

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const measure = () => {
      const multipliers = hasDenseSection ? [1, 0.9, 0.8] : [1.15, 1, 0.9, 0.8];
      const candidates = multipliers.map((multiplier) => multiplier * textScale);
      let nextScale = candidates[candidates.length - 1];
      for (const candidate of candidates) {
        content.style.fontSize = `${16 * candidate}px`;
        if (
          content.scrollHeight <= content.clientHeight + 1 &&
          content.scrollWidth <= content.clientWidth + 1
        ) {
          nextScale = candidate;
          break;
        }
      }
      content.style.fontSize = `${16 * nextScale}px`;
      setFitScale((currentScale) => currentScale === nextScale ? currentScale : nextScale);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(content);
    return () => observer.disconnect();
  }, [hasDenseSection, part, textScale]);

  const text = dark ? 'text-white' : 'text-ink';
  const secondary = dark ? 'text-[#C9CBC4]' : 'text-ink-2';
  const divider = dark ? 'border-[#2A2C27]' : 'border-line-2';

  return (
    <div
      ref={viewportRef}
      className={`min-h-0 flex-1 overflow-hidden px-14 py-[30px] ${dark ? 'bg-ink' : 'bg-paper'}`}
      data-fit-scale={fitScale}
    >
      <div
        ref={contentRef}
        className="h-full w-full overflow-hidden"
        style={{ fontSize: `${16 * fitScale}px` }}
      >
        {(part || schemes.length > 0) && (
          <div className="mb-[1.1em] flex min-h-[2em] flex-wrap items-center gap-[.45em]">
            {part?.format && (
              <span className="rounded-sm bg-lime px-[.55em] py-[.2em] font-display text-[1.625em] font-extrabold uppercase leading-none text-ink">
                {part.format}
              </span>
            )}
            {[part?.team, ...(part?.meta || []), ...schemes.map((scheme) => scheme.name)]
              .filter((stamp): stamp is string => Boolean(stamp))
              .map((stamp, index) => (
                <span
                  key={`${stamp}-${index}`}
                  className={`rounded-sm border-2 px-[.55em] py-[.16em] font-display text-[1.5em] font-extrabold uppercase leading-none ${dark ? 'border-white/60 text-white' : 'border-ink text-ink'}`}
                >
                  {stamp}
                </span>
              ))}
            {repeatNote && (
              <span className={`rounded-sm border-2 px-[.55em] py-[.16em] font-display text-[1.5em] font-extrabold uppercase leading-none ${dark ? 'border-white/60 text-white' : 'border-ink text-ink'}`}>
                ↻ Repeat until time
              </span>
            )}
          </div>
        )}

        <h1 className={`mb-[.18em] truncate font-display text-[6em] font-black uppercase leading-[.9] ${text}`}>
          {part?.title || 'Workout'}
        </h1>

        {groups.length ? (
          <div className="space-y-[.7em]">
            {groups.map((group, groupIndex) => {
              const movementCount = group.blocks.filter((block) => block.type === 'movement').length;
              const twoColumns = movementCount > 6;
              return (
                <section key={`${group.title || 'main'}-${groupIndex}`} className="min-w-0">
                  {group.title && (
                    <div className={`mb-[.25em] flex items-center gap-[.7em] text-[1.25em] font-bold uppercase tracking-[.16em] ${secondary}`}>
                      <span className="shrink-0">{group.title}</span>
                      <span className={`h-[2px] flex-1 ${dark ? 'bg-[#2A2C27]' : 'bg-ink'}`} />
                    </div>
                  )}
                  <div className={twoColumns ? 'grid grid-cols-2 gap-x-12' : ''}>
                    {group.blocks.map((block, index) => (
                      <WorkoutTvBlock
                        key={`${block.line}-${block.name}-${index}`}
                        block={block}
                        divider={divider}
                        text={text}
                        secondary={secondary}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : !part ? (
          <p className={`text-[1.25em] ${secondary}`}>No workout description.</p>
        ) : null}

        {notes.length > 0 && (
          <div className="mt-[.75em] space-y-[.25em]">
            {notes.map((note) => (
              <p
                key={`${note.line}-${note.name}`}
                className={`flex items-center gap-[.45em] truncate border-b-2 py-[.22em] text-[1.25em] font-medium ${dark ? 'border-[#2A2C27]' : 'border-line-2'} ${secondary}`}
              >
                <span className="shrink-0 font-bold text-lime">↻</span>
                <span className="truncate">{note.name}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkoutTvBlock({
  block,
  divider,
  text,
  secondary,
}: {
  block: WorkoutBlock;
  divider: string;
  text: string;
  secondary: string;
}) {
  if (block.type === 'movement') {
    return (
      <div className={`grid min-h-[5.125em] grid-cols-[6em_minmax(0,1fr)] items-center gap-[.9em] border-b-2 py-[.32em] ${divider}`}>
        <span className={`font-display text-[3.75em] font-black leading-none tabular-nums ${text}`}>
          {block.reps || '—'}
        </span>
        <div className="min-w-0">
          <p className={`font-sans text-[2em] font-bold leading-tight ${text}`}>
            {block.name}
            {block.load && <span className={`ml-[.35em] text-[.6875em] font-bold ${secondary}`}>{block.load}</span>}
          </p>
          {block.alt && (
            <p className={`mt-[.08em] truncate text-[1.25em] font-medium ${secondary}`}>↳ {block.alt}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <p className={`border-b-2 py-[.55em] text-[1.25em] font-semibold ${divider} ${block.type === 'text' ? secondary : text}`}>
      {block.name}
    </p>
  );
}

export default function WorkoutTvBoard({ workout }: { workout: BoardWorkout }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const nextTimerRef = useRef<number | null>(null);
  const countInTimerRef = useRef<number | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const parts = useMemo(() => parseWorkout(workout.description || '').parts, [workout.description]);
  const [activePart, setActivePart] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [activeLoaded, setActiveLoaded] = useState(false);
  const [textScale, setTextScale] = useState(1);
  const [dark, setDark] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stageScale, setStageScale] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [countIn, setCountIn] = useState<number | null>(null);
  const [nextAnnouncement, setNextAnnouncement] = useState('');
  const [now, setNow] = useState(() => new Date());
  const revealTimerRef = useRef<number | null>(null);
  const teamNames = [
    ...(workout.participants || []).map((participant) => participant.user_name),
    ...(workout.guests || []).map((guest) => guest.name),
  ];
  const part = parts[activePart];
  const partMinutes = part?.minutes || 0;
  const durationSeconds = partMinutes * 60;
  const totalMinutes = parts.reduce((total, item) => total + (item.minutes || 0), 0);
  const minutesBeforePart = parts.slice(0, activePart).reduce((total, item) => total + (item.minutes || 0), 0);
  const classElapsedSeconds = minutesBeforePart * 60 + elapsedSeconds;
  const startDate = parseISO(workout.date);
  const endDate = addMinutes(startDate, totalMinutes);
  const upcomingPart = parts[activePart + 1];
  const partStartDate = addMinutes(startDate, minutesBeforePart + partMinutes);
  const formatLabel = part?.format === 'AMRAP'
    ? `AMRAP · ${partMinutes}′`
    : part?.format === 'EMOM'
      ? `EMOM · ${partMinutes}′`
      : partMinutes
        ? `TIME CAP · ${partMinutes}′`
        : 'COUNT UP';
  const timerValue = part?.format === 'AMRAP'
    ? formatTime(durationSeconds - elapsedSeconds)
    : part?.format === 'EMOM'
      ? `${String(Math.min(partMinutes || 1, Math.floor(elapsedSeconds / 60) + 1)).padStart(2, '0')}:${String((60 - (elapsedSeconds % 60)) % 60).padStart(2, '0')}`
      : formatTime(elapsedSeconds);
  const partProgress = durationSeconds ? Math.min(1, elapsedSeconds / durationSeconds) : 0;

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);
    revealTimerRef.current = window.setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const resize = () => {
      setStageScale(Math.min(wrapper.clientWidth / STAGE_WIDTH, wrapper.clientHeight / STAGE_HEIGHT));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setTextScale(getStoredTextScale());
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const storageKey = `${TIMER_STORAGE_PREFIX}${workout.id}`;
    const frameId = window.requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const saved = JSON.parse(raw) as PersistedTimerState;
          const savedPart = Number.isInteger(saved.activePart) && saved.activePart >= 0 && saved.activePart < parts.length
            ? saved.activePart
            : 0;
          const idleSeconds = saved.timerRunning
            ? Math.max(0, Math.floor((Date.now() - saved.savedAt) / 1000))
            : 0;
          const restoredElapsed = Math.max(0, saved.elapsedSeconds + idleSeconds);
          const restoredDuration = (parts[savedPart]?.minutes || 0) * 60;
          setActivePart(savedPart);
          setElapsedSeconds(restoredDuration ? Math.min(restoredElapsed, restoredDuration) : restoredElapsed);
          setTimerRunning(Boolean(saved.timerRunning && (!restoredDuration || restoredElapsed < restoredDuration)));
        }
      } catch (storageError) {
        console.warn('Could not restore TV workout timer state:', storageError);
      }
      setActiveLoaded(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [parts, workout.id]);

  useEffect(() => {
    if (!activeLoaded) return;
    try {
      const state: PersistedTimerState = {
        activePart,
        elapsedSeconds,
        timerRunning,
        savedAt: Date.now(),
      };
      localStorage.setItem(`${TIMER_STORAGE_PREFIX}${workout.id}`, JSON.stringify(state));
    } catch (storageError) {
      console.warn('Could not persist TV workout timer state:', storageError);
    }
  }, [activeLoaded, activePart, elapsedSeconds, timerRunning, workout.id]);

  useEffect(() => {
    const clockId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(clockId);
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const intervalId = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, [timerRunning, activePart]);

  useEffect(() => {
    if (!timerRunning || !durationSeconds || elapsedSeconds < durationSeconds) return;
    completionTimerRef.current = window.setTimeout(() => {
      setTimerRunning(false);
      if (soundEnabled) playTone(1046, 0.5);
      if (activePart + 1 >= parts.length) return;

      const nextIndex = activePart + 1;
      setNextAnnouncement(`NEXT: ${String(nextIndex + 1).padStart(2, '0')} ${parts[nextIndex].title}`);
      nextTimerRef.current = window.setTimeout(() => {
        setActivePart(nextIndex);
        setElapsedSeconds(0);
        setNextAnnouncement('');
        nextTimerRef.current = null;
      }, 10_000);
    }, 0);
    return () => {
      if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
    };
  }, [activePart, durationSeconds, elapsedSeconds, parts, soundEnabled, timerRunning]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(revealControls);
    return () => {
      window.cancelAnimationFrame(frameId);
      if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);
      if (nextTimerRef.current !== null) window.clearTimeout(nextTimerRef.current);
      if (countInTimerRef.current !== null) window.clearTimeout(countInTimerRef.current);
      if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
    };
  }, [revealControls]);

  useEffect(() => {
    const reveal = () => revealControls();
    window.addEventListener('mousemove', reveal);
    window.addEventListener('touchstart', reveal);
    return () => {
      window.removeEventListener('mousemove', reveal);
      window.removeEventListener('touchstart', reveal);
    };
  }, [revealControls]);

  const changePart = useCallback((index: number) => {
    if (index < 0 || index >= parts.length) return;
    if (nextTimerRef.current !== null) window.clearTimeout(nextTimerRef.current);
    if (countInTimerRef.current !== null) window.clearTimeout(countInTimerRef.current);
    if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
    nextTimerRef.current = null;
    countInTimerRef.current = null;
    completionTimerRef.current = null;
    setNextAnnouncement('');
    setCountIn(null);
    setActivePart(index);
    setElapsedSeconds(0);
    setTimerRunning(false);
  }, [parts.length]);

  const startTimer = useCallback(() => {
    if (timerRunning) {
      setTimerRunning(false);
      return;
    }
    if (countInTimerRef.current !== null) {
      window.clearTimeout(countInTimerRef.current);
      countInTimerRef.current = null;
      setCountIn(null);
      return;
    }
    if (!soundEnabled) {
      setTimerRunning(true);
      return;
    }

    let remaining = 3;
    setCountIn(remaining);
    playTone(660);
    const tick = () => {
      remaining -= 1;
      if (remaining === 0) {
        playTone(1046);
        setCountIn(null);
        setTimerRunning(true);
        countInTimerRef.current = null;
        return;
      }
      setCountIn(remaining);
      playTone(660);
      countInTimerRef.current = window.setTimeout(tick, 1000);
    };
    countInTimerRef.current = window.setTimeout(tick, 1000);
  }, [soundEnabled, timerRunning]);

  const resetPart = useCallback(() => {
    if (nextTimerRef.current !== null) window.clearTimeout(nextTimerRef.current);
    if (countInTimerRef.current !== null) window.clearTimeout(countInTimerRef.current);
    if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
    nextTimerRef.current = null;
    countInTimerRef.current = null;
    completionTimerRef.current = null;
    setNextAnnouncement('');
    setCountIn(null);
    setElapsedSeconds(0);
    setTimerRunning(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (fullscreenError) {
      console.warn('Fullscreen mode is unavailable:', fullscreenError);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      revealControls();
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        changePart(activePart - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        changePart(activePart + 1);
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        startTimer();
      } else if (event.key.toLowerCase() === 'r') {
        resetPart();
      } else if (event.key.toLowerCase() === 'f') {
        void toggleFullscreen();
      } else if (event.key.toLowerCase() === 'd') {
        setDark((value) => !value);
      } else if (event.key === 'Escape') {
        window.location.assign(`/workouts/${workout.id}`);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePart, changePart, resetPart, revealControls, startTimer, toggleFullscreen, workout.id]);

  const changeTextScale = () => {
    const currentIndex = TEXT_SCALES.indexOf(textScale as (typeof TEXT_SCALES)[number]);
    const nextScale = TEXT_SCALES[(currentIndex + 1) % TEXT_SCALES.length];
    setTextScale(nextScale);
    try {
      localStorage.setItem(TEXT_SCALE_STORAGE_KEY, String(nextScale));
    } catch (storageError) {
      console.warn('Could not save TV board text size preference:', storageError);
    }
  };

  const classDoneMinutes = Math.floor(classElapsedSeconds / 60);
  const teamLabel = teamNames.length ? teamNames.join(' · ') : `${workout.max_participants} spots`;
  const mainBackground = dark ? 'bg-ink' : 'bg-paper';

  return (
    <div ref={wrapperRef} className={`fixed inset-0 overflow-hidden ${dark ? 'bg-ink' : 'bg-ink'} ${controlsVisible ? '' : 'cursor-none'}`}>
      <main
        className={`absolute left-1/2 top-1/2 grid overflow-hidden border-[16px] border-[#141512] ${mainBackground}`}
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          boxSizing: 'border-box',
          gridTemplateColumns: `minmax(0, 1fr) 540px`,
          transform: `translate(-50%, -50%) scale(${stageScale})`,
          transformOrigin: 'center center',
        }}
        onMouseMove={revealControls}
        onTouchStart={revealControls}
      >
        <div className="grid min-h-0 min-w-0" style={{ gridTemplateRows: '96px minmax(0, 1fr)' }}>
          <nav
            className="grid border-b-[3px] border-ink"
            style={{ gridTemplateColumns: `repeat(${Math.max(parts.length, 1)}, minmax(0, 1fr))` }}
            aria-label="Workout parts"
          >
            {parts.length ? parts.map((navPart, index) => {
              const selected = index === activePart;
              const done = index < activePart;
              return (
                <button
                  key={`${navPart.title}-${index}`}
                  type="button"
                  onClick={() => changePart(index)}
                  aria-current={selected ? 'step' : undefined}
                  className={`flex min-w-0 items-center gap-4 border-r border-line px-6 text-left ${selected ? 'bg-lime text-ink' : done ? 'bg-canvas text-ink-2' : 'bg-paper text-ink'}`}
                >
                  <span className="shrink-0 font-display text-[40px] font-black leading-none tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-[28px] font-extrabold uppercase leading-tight">{navPart.title}</span>
                    <span className="block truncate text-[20px] font-bold leading-tight">
                      {navPart.minutes ? `${navPart.minutes}′` : 'COUNT UP'}{selected || done ? ` · ${selected ? 'now' : 'done'}` : ''}
                    </span>
                  </span>
                </button>
              );
            }) : (
              <div className="flex items-center px-6 font-display text-[28px] font-extrabold uppercase text-ink">No workout parts</div>
            )}
          </nav>

          <WorkoutTvContent part={part} dark={dark} textScale={textScale} />
        </div>

        <aside className="flex min-h-0 flex-col overflow-hidden bg-[#141512] px-10 py-[34px] text-white">
          <div className="flex items-center justify-between gap-4">
            <span className="font-display text-[30px] font-black uppercase leading-none">PURE</span>
            <time className="font-sans text-[24px] font-bold tabular-nums" dateTime={now.toISOString()}>
              {format(now, 'HH:mm')}
            </time>
          </div>
          <p className="mt-2 text-[20px] font-semibold uppercase tracking-[.08em] text-[#C9CBC4]">
            {format(startDate, 'EEE dd MMM')} · CLASS START {format(startDate, 'HH:mm')}
          </p>

          <div className="mt-7">
            <p className="mb-2 text-[20px] font-bold uppercase tracking-[.16em] text-lime">{formatLabel}</p>
            <button
              type="button"
              onClick={startTimer}
              aria-label={timerRunning ? 'Pause timer' : countIn ? 'Cancel timer countdown' : 'Start timer'}
              className="block w-full overflow-hidden text-left font-display font-black leading-[.95] tabular-nums text-lime focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-lime/40"
            >
              <span
                className="block origin-left"
                style={{ width: '125%', transform: 'scaleX(.8)', fontSize: '220px', letterSpacing: 'normal' }}
              >
                {countIn || timerValue}
              </span>
            </button>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-[#2A2C27]" role="progressbar" aria-label="Part timer progress" aria-valuenow={Math.round(partProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-lime transition-[width] duration-300" style={{ width: `${partProgress * 100}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[20px] font-semibold text-[#C9CBC4]">
              <span>{formatTime(elapsedSeconds)} done</span>
              <span>{timerRunning ? 'RUNNING' : 'PAUSED'}</span>
            </div>
            {nextAnnouncement && (
              <p className="mt-3 rounded-sm bg-lime px-3 py-2 font-display text-[24px] font-extrabold uppercase leading-tight text-ink">
                {nextAnnouncement}
              </p>
            )}
          </div>

          <section className="mt-6 border-t border-[#2A2C27] pt-5">
            <p className="mb-2 text-[20px] font-bold uppercase tracking-[.16em] text-[#C9CBC4]">After this</p>
            {upcomingPart ? (
              <>
                <p className="truncate font-display text-[44px] font-extrabold uppercase leading-[.95] text-white">{upcomingPart.title}</p>
                <p className="mt-2 text-[22px] font-semibold text-[#C9CBC4]">
                  Starts {format(partStartDate, 'HH:mm')} · {upcomingPart.minutes ? `${upcomingPart.minutes}′` : 'COUNT UP'}
                </p>
              </>
            ) : (
              <p className="font-display text-[32px] font-extrabold uppercase text-white">Class ends {format(endDate, 'HH:mm')}</p>
            )}
          </section>

          <section className="mt-6 border-t border-[#2A2C27] pt-5">
            <p className="mb-2 text-[20px] font-bold uppercase tracking-[.16em] text-[#C9CBC4]">Team</p>
            <p className="text-[30px] font-bold leading-snug text-white">{teamLabel}</p>
          </section>

          <section className="mt-auto border-t border-[#2A2C27] pt-5">
            <div className="mb-2 flex items-baseline justify-between gap-3 text-[20px] font-bold uppercase tracking-[.1em] text-[#C9CBC4]">
              <span>Class</span>
              <span>{classDoneMinutes} / {totalMinutes} min · Ends {format(endDate, 'HH:mm')}</span>
            </div>
            <div className="flex h-[10px] gap-1" aria-label={`Class progress: ${classDoneMinutes} of ${totalMinutes} minutes`}>
              {parts.map((item, index) => {
                const width = `${((item.minutes || 1) / (parts.reduce((sum, entry) => sum + (entry.minutes || 1), 0))) * 100}%`;
                const fill = index < activePart ? 1 : index === activePart ? partProgress : 0;
                return (
                  <div key={`${item.title}-${index}`} className="min-w-[4px] flex-1 overflow-hidden rounded-sm bg-[#2A2C27]" style={{ flexBasis: width }}>
                    <div className={`h-full ${index < activePart ? 'bg-[#C9CBC4]' : 'bg-lime'}`} style={{ width: `${fill * 100}%` }} />
                  </div>
                );
              })}
            </div>
          </section>
        </aside>

        <div
          className={`absolute bottom-5 left-5 z-20 max-w-[calc(100%-580px)] rounded-sm border border-white/30 bg-[#141512]/95 px-5 py-4 text-white shadow-xl transition-opacity ${controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          role="group"
          aria-label="TV board controls"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Link href={`/workouts/${workout.id}`} className="inline-flex min-h-11 items-center rounded-sm bg-white px-3 text-[20px] font-bold text-ink">Exit</Link>
            <button type="button" onClick={changeTextScale} className="min-h-11 rounded-sm border border-white/40 px-3 text-[20px] font-bold">A A+</button>
            <button type="button" onClick={() => setDark((value) => !value)} className="min-h-11 rounded-sm border border-white/40 px-3 text-[20px] font-bold">{dark ? 'Light' : 'Dark'}</button>
            <button type="button" onClick={() => setSoundEnabled((value) => !value)} aria-pressed={soundEnabled} className="min-h-11 rounded-sm border border-white/40 px-3 text-[20px] font-bold">Sound {soundEnabled ? 'On' : 'Off'}</button>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[20px] font-semibold text-[#C9CBC4]">
            <span>← → part</span><span>Space / Enter start</span><span>R reset</span><span>F fullscreen</span><span>D dark / light</span><span>Esc exit</span>
          </div>
        </div>
      </main>
    </div>
  );
}
