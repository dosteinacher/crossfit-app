'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { addMinutes, format, parseISO } from 'date-fns';
import Link from 'next/link';
import type { Guest, WorkoutWithDetails } from '@/lib/types';
import SectionHeader from '@/components/SectionHeader';
import TimerPanel from '@/components/TimerPanel';
import { pauseStoredIntervalTimer } from '@/lib/intervalTimerPersistence';
import type { WorkoutBlock, WorkoutPart, WorkoutSectionBlock } from '@/lib/workoutNotation';
import { getWorkoutBlockText, parseWorkout } from '@/lib/workoutNotation';
import {
  getFitScaleCandidates,
  getTotalMovementCount,
  getUniqueWorkoutStamps,
} from '@/lib/workout-tv-layout';

type BoardWorkout = WorkoutWithDetails & { guests: Guest[] };
type PersistedTimerState = {
  activePart: number;
};
type WorkoutTvGroup = {
  heading?: WorkoutSectionBlock | Extract<WorkoutBlock, { type: 'sub' }>;
  blocks: WorkoutBlock[];
};

const TIMER_STORAGE_PREFIX = 'pure-tv-timer:';
const TEXT_SCALE_STORAGE_KEY = 'pure-tv-text-scale';
const TEXT_SCALES = [1, 1.1, 1.2] as const;

function getPartGroups(part: WorkoutPart | undefined) {
  const groups: WorkoutTvGroup[] = [{ blocks: [] }];
  const notes: Extract<WorkoutBlock, { type: 'note' }>[] = [];
  const schemes: Extract<WorkoutBlock, { type: 'scheme' }>[] = [];

  for (const block of part?.blocks || []) {
    if (block.type === 'section' || block.type === 'sub') {
      if (groups[groups.length - 1].heading || groups[groups.length - 1].blocks.length) {
        groups.push({ heading: block, blocks: [] });
      } else {
        groups[groups.length - 1].heading = block;
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
    groups: groups.filter((group) => group.heading || group.blocks.length),
    notes,
    schemes,
  };
}

function getStoredTextScale(): number {
  try {
    const stored = Number(localStorage.getItem(TEXT_SCALE_STORAGE_KEY));
    return TEXT_SCALES.includes(stored as (typeof TEXT_SCALES)[number]) ? stored : 1.1;
  } catch (storageError) {
    console.warn('Could not read TV board text size preference:', storageError);
    return 1.1;
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
  const movementCount = getTotalMovementCount(groups);
  const twoColumns = movementCount > 6;
  const repeatNote = notes.some((note) => /\b(?:repeat|again|wieder|beginnt|start again|loop)\b/i.test(note.name));

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const measure = () => {
      const candidates = getFitScaleCandidates(textScale);
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
  }, [movementCount, part, textScale]);

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
            {getUniqueWorkoutStamps([part?.team, ...(part?.meta || []), ...schemes.map((scheme) => scheme.name)])
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
              return (
                <section key={`${group.heading ? getWorkoutBlockText(group.heading) : 'main'}-${groupIndex}`} className="min-w-0">
                  {group.heading?.type === 'section' ? (
                    <SectionHeader section={group.heading} variant="stage" dark={dark} />
                  ) : group.heading?.type === 'sub' ? (
                    <div className={`mb-[.25em] flex items-center gap-[.7em] text-[1.25em] font-bold uppercase tracking-[.16em] ${secondary}`}>
                      <span className="shrink-0">{group.heading.name}</span>
                      <span className={`h-[2px] flex-1 ${dark ? 'bg-[#2A2C27]' : 'bg-ink'}`} />
                    </div>
                  ) : null}
                  <div className={twoColumns ? 'grid grid-cols-2 gap-x-12' : ''}>
                    {group.blocks.map((block, index) => (
                      <WorkoutTvBlock
                        key={`${block.line}-${getWorkoutBlockText(block)}-${index}`}
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
                className={`flex items-center gap-[.45em] border-b-2 py-[.22em] text-[1.5em] font-medium ${dark ? 'border-[#2A2C27]' : 'border-line-2'} ${secondary}`}
              >
                <span className="shrink-0 font-bold text-lime">↻</span>
                <span>{note.name}</span>
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
            <p className={`mt-[.08em] text-[1.5em] font-medium ${secondary}`}>↳ {block.alt}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <p className={`border-b-2 py-[.55em] text-[1.25em] font-semibold ${divider} ${block.type === 'text' ? secondary : text}`}>
      {getWorkoutBlockText(block)}
    </p>
  );
}

export default function WorkoutTvBoard({ workout }: { workout: BoardWorkout }) {
  const parts = useMemo(() => parseWorkout(workout.description || '').parts, [workout.description]);
  const [activePart, setActivePart] = useState(0);
  const [activeLoaded, setActiveLoaded] = useState(false);
  const [textScale, setTextScale] = useState(1.1);
  const [dark, setDark] = useState(false);
  const [auxiliaryControlsVisible, setAuxiliaryControlsVisible] = useState(true);
  const [coreControlsHidden, setCoreControlsHidden] = useState(false);
  const [coreControlsDimmed, setCoreControlsDimmed] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const revealTimerRef = useRef<number | null>(null);
  const dimTimerRef = useRef<number | null>(null);
  const teamNames = [
    ...(workout.participants || []).map((participant) => participant.user_name),
    ...(workout.guests || []).map((guest) => guest.name),
  ];
  const part = parts[activePart];
  const displayPart: WorkoutPart = part || { title: 'Workout', meta: [], blocks: [] };
  const totalMinutes = parts.reduce((total, item) => total + (item.minutes || 0), 0);
  const minutesBeforePart = parts.slice(0, activePart).reduce((total, item) => total + (item.minutes || 0), 0);
  const startDate = parseISO(workout.date);
  const endDate = addMinutes(startDate, totalMinutes);
  const upcomingPart = parts[activePart + 1];

  const scheduleControlsDim = useCallback(() => {
    setCoreControlsDimmed(false);
    if (dimTimerRef.current !== null) window.clearTimeout(dimTimerRef.current);
    dimTimerRef.current = window.setTimeout(() => setCoreControlsDimmed(true), 5000);
  }, []);

  const handleActivity = useCallback(() => {
    setAuxiliaryControlsVisible(true);
    if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);
    revealTimerRef.current = window.setTimeout(() => setAuxiliaryControlsVisible(false), 3000);
    if (!coreControlsHidden) scheduleControlsDim();
  }, [coreControlsHidden, scheduleControlsDim]);

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
          setActivePart(savedPart);
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
      };
      localStorage.setItem(`${TIMER_STORAGE_PREFIX}${workout.id}`, JSON.stringify(state));
    } catch (storageError) {
      console.warn('Could not persist TV workout timer state:', storageError);
    }
  }, [activeLoaded, activePart, workout.id]);

  useEffect(() => {
    const clockId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(clockId);
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(handleActivity);
    return () => {
      window.cancelAnimationFrame(frameId);
      if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);
      if (dimTimerRef.current !== null) window.clearTimeout(dimTimerRef.current);
    };
  }, [handleActivity]);

  useEffect(() => {
    const reveal = () => handleActivity();
    window.addEventListener('mousemove', reveal);
    window.addEventListener('touchstart', reveal);
    return () => {
      window.removeEventListener('mousemove', reveal);
      window.removeEventListener('touchstart', reveal);
    };
  }, [handleActivity]);

  const changePart = useCallback((index: number) => {
    if (index < 0 || index >= parts.length) return;
    pauseStoredIntervalTimer(workout.id, activePart);
    setActivePart(index);
  }, [activePart, parts.length, workout.id]);
  const advanceIntervalPart = useCallback(() => changePart(activePart + 1), [activePart, changePart]);

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
      handleActivity();
      if (event.key.toLowerCase() === 'h') {
        event.preventDefault();
        if (coreControlsHidden) {
          setCoreControlsHidden(false);
          scheduleControlsDim();
        } else {
          setCoreControlsHidden(true);
          setCoreControlsDimmed(false);
          if (dimTimerRef.current !== null) window.clearTimeout(dimTimerRef.current);
          dimTimerRef.current = null;
        }
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        changePart(activePart - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        changePart(activePart + 1);
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
  }, [activePart, changePart, coreControlsHidden, handleActivity, scheduleControlsDim, toggleFullscreen, workout.id]);

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

  const teamLabel = teamNames.length ? teamNames.join(' · ') : `${workout.max_participants} spots`;
  const mainBackground = dark ? 'bg-ink' : 'bg-paper';

  return (
    <div className={`fixed inset-0 overflow-hidden bg-ink ${auxiliaryControlsVisible ? '' : 'cursor-none'}`}>
      <main
        className={`absolute inset-0 grid overflow-hidden border-[16px] border-[#141512] ${mainBackground}`}
        style={{
          boxSizing: 'border-box',
          gridTemplateColumns: 'minmax(0, 1fr) clamp(300px, 28.125vw, 540px)',
        }}
        onMouseMove={handleActivity}
        onTouchStart={handleActivity}
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
                    <span className="block truncate font-display text-[26px] font-extrabold uppercase leading-tight">{navPart.title}</span>
                    <span className="block truncate text-[20px] font-bold leading-tight">
                      {navPart.minutes ? `${navPart.minutes}′` : 'COUNT UP'}{selected || done ? ` · ${selected ? 'now' : 'done'}` : ''}
                    </span>
                  </span>
                </button>
              );
            }) : (
              <div className="flex items-center px-6 font-display text-[28px] font-extrabold uppercase text-ink">Workout overview</div>
            )}
          </nav>

          <WorkoutTvContent part={part} dark={dark} textScale={textScale} />
        </div>

        <aside className="flex min-h-0 flex-col overflow-hidden bg-[#141512] text-white" style={{ containerType: 'inline-size' }}>
          <TimerPanel
            key={`${workout.id}-${activePart}`}
            size="stage"
            workoutId={workout.id}
            partIndex={activePart}
            part={displayPart}
            upcomingPartTitle={upcomingPart?.title}
            currentTime={now}
            controlsDimmed={coreControlsDimmed}
            coreControlsVisible={!coreControlsHidden}
            onActivity={handleActivity}
            onAutoAdvance={upcomingPart ? advanceIntervalPart : undefined}
            stageFooter={({ elapsedSeconds: panelElapsed, partProgress: panelProgress }) => {
              const classDoneMinutes = Math.floor((minutesBeforePart * 60 + panelElapsed) / 60);
              return (
                <>
                  <section className="border-t border-[#2A2C27] pt-5">
                    <p className="mb-2 text-[24px] font-bold uppercase tracking-[.16em] text-[#C9CBC4]">Team</p>
                    <p className="text-[30px] font-bold leading-snug text-white">{teamLabel}</p>
                  </section>
                  <section className="border-t border-[#2A2C27] pt-5">
                    <div className="mb-2 flex items-baseline justify-between gap-3 text-[24px] font-bold uppercase tracking-[.1em] text-[#C9CBC4]">
                      <span>Class</span>
                      <span>{classDoneMinutes} / {totalMinutes} min · Ends {format(endDate, 'HH:mm')}</span>
                    </div>
                    <div className="flex h-[10px] gap-1" aria-label={`Class progress: ${classDoneMinutes} of ${totalMinutes} minutes`}>
                      {parts.map((item, index) => {
                        const width = `${((item.minutes || 1) / (parts.reduce((sum, entry) => sum + (entry.minutes || 1), 0))) * 100}%`;
                        const fill = index < activePart ? 1 : index === activePart ? panelProgress : 0;
                        return (
                          <div key={`${item.title}-${index}`} className="min-w-[4px] flex-1 overflow-hidden rounded-sm bg-[#2A2C27]" style={{ flexBasis: width }}>
                            <div className={`h-full ${index < activePart ? 'bg-[#C9CBC4]' : 'bg-lime'}`} style={{ width: `${fill * 100}%` }} />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </>
              );
            }}
          />
        </aside>

        <div
          className={`absolute bottom-5 left-5 z-20 max-w-[calc(100%-580px)] rounded-sm border border-white/30 bg-[#141512]/95 px-5 py-4 text-white shadow-xl transition-opacity ${auxiliaryControlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          role="group"
          aria-label="TV board controls"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Link href={`/workouts/${workout.id}`} className="inline-flex min-h-12 items-center rounded-sm bg-white px-3 text-[20px] font-bold text-ink">Exit</Link>
            <button type="button" onClick={changeTextScale} className="min-h-12 rounded-sm border border-white/40 px-3 text-[20px] font-bold">A A+</button>
            <button type="button" onClick={() => setDark((value) => !value)} className="min-h-12 rounded-sm border border-white/40 px-3 text-[20px] font-bold">{dark ? 'Light' : 'Dark'}</button>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[20px] font-semibold text-[#C9CBC4]">
            <span>← → part</span><span>Space / Enter / OK start</span><span>[ ] interval / ±1 min</span><span>T setup</span><span>M sound</span><span>H hide controls</span><span>R stop</span><span>F fullscreen</span><span>D dark / light</span><span>Esc exit</span>
          </div>
        </div>
      </main>
    </div>
  );
}
