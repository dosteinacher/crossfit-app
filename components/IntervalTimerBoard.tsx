'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { buildTimeline, stateAt, type Phase } from '@/lib/intervalTimer';
import {
  getIntervalTimerStorageKey,
  restoreIntervalTimerState,
  type PersistedIntervalTimer,
} from '@/lib/intervalTimerPersistence';
import type { IntervalTimer } from '@/lib/workoutNotation';

type Volume = 'low' | 'medium' | 'high';

const SOUND_STORAGE_KEY = 'pure.board.sound';
const VOLUME_STORAGE_KEY = 'pure.board.volume';

const PHASE_STYLE: Record<Phase, { label: string; color: string; className: string }> = {
  prep: { label: 'GET READY', color: '#FF8A1F', className: 'text-[#FF8A1F]' },
  work: { label: 'WORK', color: '#C8F31D', className: 'text-lime' },
  rest: { label: 'REST', color: '#6CC4FF', className: 'text-[#6CC4FF]' },
  setrest: { label: 'SET BREAK', color: '#6CC4FF', className: 'text-[#6CC4FF]' },
};

function formatTime(seconds: number, padMinutes = false) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  return `${padMinutes ? String(minutes).padStart(2, '0') : minutes}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

function getStoredSoundPreferences() {
  try {
    const sound = localStorage.getItem(SOUND_STORAGE_KEY);
    const volume = localStorage.getItem(VOLUME_STORAGE_KEY);
    return {
      soundEnabled: sound === null ? true : sound === 'true',
      volume: volume === 'low' || volume === 'high' ? volume : 'medium' as Volume,
    };
  } catch (storageError) {
    console.warn('Could not read interval timer sound preferences:', storageError);
    return { soundEnabled: true, volume: 'medium' as Volume };
  }
}

export default function IntervalTimerBoard({
  size,
  workoutId,
  partIndex,
  partTitle,
  timer,
  upcomingPartTitle,
  currentTime,
  controlsVisible = true,
  onActivity,
  onAutoAdvance,
  stageFooter,
}: {
  size: 'stage' | 'compact';
  workoutId: number | string;
  partIndex: number;
  partTitle: string;
  timer: IntervalTimer;
  upcomingPartTitle?: string;
  currentTime?: Date;
  controlsVisible?: boolean;
  onActivity?: () => void;
  onAutoAdvance?: () => void;
  stageFooter?: (state: { elapsedSeconds: number; partProgress: number }) => ReactNode;
}) {
  const storageKey = getIntervalTimerStorageKey(workoutId, partIndex);
  const { end } = useMemo(() => buildTimeline(timer), [timer]);
  const [accumulated, setAccumulated] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [timerLoaded, setTimerLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState<Volume>('medium');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const advanceRef = useRef(onAutoAdvance);

  const elapsed = Math.min(end, accumulated + (running && startedAt !== null
    ? Math.max(0, Math.floor((now - startedAt) / 1000))
    : 0));
  const timerState = useMemo(() => stateAt(timer, elapsed), [elapsed, timer]);
  const phase = timerState.done ? undefined : timerState.seg?.phase;
  const phaseStyle = phase ? PHASE_STYLE[phase] : undefined;
  const phaseLabel = phaseStyle?.label || 'DONE';
  const phaseColor = phaseStyle?.color || '#FFFFFF';
  const nextLabel = timerState.done
    ? 'NEXT PART'
    : timerState.next
      ? `${PHASE_STYLE[timerState.next.phase].label} ${formatTime(timerState.next.dur)}`
      : 'FINISH';
  const partProgress = timerState.done
    ? 1
    : Math.max(0, Math.min(1, elapsed / Math.max(1, end)));
  const advanceAnnouncement = timerState.done && upcomingPartTitle && onAutoAdvance
    ? `NEXT: ${String(partIndex + 2).padStart(2, '0')} ${upcomingPartTitle}`
    : '';

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const saved = restoreIntervalTimerState(JSON.parse(raw) as unknown, Date.now(), end);
          if (saved) {
            setAccumulated(saved.accumulated);
            setStartedAt(saved.startedAt);
            setRunning(saved.running);
          } else {
            console.warn('Ignoring malformed interval timer state:', storageKey);
            setAccumulated(0);
            setStartedAt(null);
            setRunning(false);
          }
        } else {
          setAccumulated(0);
          setStartedAt(null);
          setRunning(false);
        }
      } catch (storageError) {
        console.warn('Could not restore interval timer state:', storageError);
        setAccumulated(0);
        setStartedAt(null);
        setRunning(false);
      }
      setNow(Date.now());
      setTimerLoaded(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [end, storageKey]);

  useEffect(() => {
    if (!timerLoaded) return;
    const state: PersistedIntervalTimer = { accumulated, startedAt, running };
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (storageError) {
      console.warn('Could not persist interval timer state:', storageError);
    }
  }, [accumulated, running, startedAt, storageKey, timerLoaded]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const preferences = getStoredSoundPreferences();
      setSoundEnabled(preferences.soundEnabled);
      setVolume(preferences.volume);
      setPreferencesLoaded(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled));
      localStorage.setItem(VOLUME_STORAGE_KEY, volume);
    } catch (storageError) {
      console.warn('Could not persist interval timer sound preferences:', storageError);
    }
  }, [preferencesLoaded, soundEnabled, volume]);

  useEffect(() => {
    if (!running) return;
    const intervalId = window.setInterval(() => setNow(Date.now()), 250);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [running]);

  useEffect(() => {
    if (!running) return;
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
  }, [running]);

  useEffect(() => {
    if (!timerLoaded || !running || !timerState.done) return;
    const frameId = window.requestAnimationFrame(() => {
      setAccumulated(end);
      setStartedAt(null);
      setRunning(false);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [end, running, timerLoaded, timerState.done]);

  useEffect(() => {
    advanceRef.current = onAutoAdvance;
  }, [onAutoAdvance]);

  useEffect(() => {
    if (!timerState.done || !upcomingPartTitle || !onAutoAdvance) return;
    const timeoutId = window.setTimeout(() => advanceRef.current?.(), 10_000);
    return () => window.clearTimeout(timeoutId);
  }, [onAutoAdvance, partIndex, timerState.done, upcomingPartTitle]);

  const liveElapsed = useCallback(() => (
    running && startedAt !== null
      ? accumulated + Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      : accumulated
  ), [accumulated, running, startedAt]);

  const setPosition = useCallback((position: number) => {
    const timestamp = Date.now();
    const nextElapsed = Math.max(0, Math.min(end, position));
    setAccumulated(nextElapsed);
    setStartedAt(running ? timestamp : null);
    setNow(timestamp);
  }, [end, running]);

  const toggleTimer = useCallback(() => {
    if (!timerLoaded) return;
    onActivity?.();
    if (running) {
      const timestamp = Date.now();
      setAccumulated(Math.min(end, liveElapsed()));
      setStartedAt(null);
      setRunning(false);
      setNow(timestamp);
      return;
    }
    const timestamp = Date.now();
    setAccumulated(timerState.done ? 0 : elapsed);
    setStartedAt(timestamp);
    setRunning(true);
    setNow(timestamp);
  }, [elapsed, end, liveElapsed, onActivity, running, timerLoaded, timerState.done]);

  const stopTimer = useCallback(() => {
    if (!timerLoaded) return;
    onActivity?.();
    setAccumulated(0);
    setStartedAt(null);
    setRunning(false);
    setNow(Date.now());
  }, [onActivity, timerLoaded]);

  const previousInterval = useCallback(() => {
    onActivity?.();
    const { segs } = buildTimeline(timer);
    if (!segs.length) return;
    if (timerState.done) {
      setPosition(segs[segs.length - 1].start);
      return;
    }
    const current = segs[timerState.index];
    if (!current) return;
    const currentStart = timerState.index === 0 || liveElapsed() - current.start > 2
      ? current.start
      : segs[timerState.index - 1].start;
    setPosition(currentStart);
  }, [liveElapsed, onActivity, setPosition, timer, timerState.done, timerState.index]);

  const nextInterval = useCallback(() => {
    onActivity?.();
    if (timerState.done) return;
    const { segs, end: timelineEnd } = buildTimeline(timer);
    setPosition(segs[timerState.index + 1]?.start ?? timelineEnd);
  }, [onActivity, setPosition, timer, timerState.done, timerState.index]);

  const toggleSound = useCallback(() => {
    onActivity?.();
    setSoundEnabled((enabled) => !enabled);
  }, [onActivity]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (!timerLoaded || (target instanceof HTMLElement && target.closest('button, input, select, textarea, [contenteditable="true"]'))) return;
      if (event.key === ' ' || event.key === 'Enter' || event.key === 'OK') {
        event.preventDefault();
        toggleTimer();
      } else if (event.key === '[') {
        event.preventDefault();
        previousInterval();
      } else if (event.key === ']') {
        event.preventDefault();
        nextInterval();
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        stopTimer();
      } else if (event.key.toLowerCase() === 'm') {
        toggleSound();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nextInterval, previousInterval, stopTimer, timerLoaded, toggleSound, toggleTimer]);

  const phaseWordClass = phaseStyle?.className || 'text-white';
  const remainingLabel = formatTime(timerState.totalLeft);
  const controlsShowing = size === 'compact' || controlsVisible;
  const buttonClass = size === 'stage'
    ? 'h-[68px] rounded-xl bg-[#1E1F1B] font-display text-[22px] font-black uppercase'
    : 'h-12 rounded-lg bg-[#1E1F1B] font-display text-[15px] font-black uppercase';
  const soundControls = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleSound}
        aria-label={soundEnabled ? 'Turn sound off' : 'Turn sound on'}
        aria-pressed={soundEnabled}
        className={`shrink-0 rounded-lg border px-3 py-2 font-display text-[15px] font-extrabold uppercase leading-none ${
          soundEnabled ? 'border-lime text-lime' : 'border-[#3A3C36] text-[#8A8D84]'
        }`}
      >
        {soundEnabled ? '🔊 Sound on' : '🔇 Sound off'}
      </button>
      <select
        aria-label="Sound volume"
        value={volume}
        onChange={(event) => {
          const value = event.target.value;
          if (value === 'low' || value === 'medium' || value === 'high') setVolume(value);
          onActivity?.();
        }}
        className="min-h-9 rounded-lg border border-[#3A3C36] bg-[#1E1F1B] px-2 text-[12px] font-bold uppercase text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
    </div>
  );
  const controls = (
    <div className={`grid gap-2 ${size === 'stage' ? 'grid-cols-[96px_72px_minmax(0,1fr)_72px]' : 'grid-cols-[64px_44px_minmax(0,1fr)_44px]'}`}>
      <button
        type="button"
        disabled={!timerLoaded}
        onClick={stopTimer}
        aria-label="Stop interval timer"
        className={`${buttonClass} text-[#FF8A1F]`}
      >
        Stop
      </button>
      <button
        type="button"
        disabled={!timerLoaded}
        onClick={previousInterval}
        aria-label="Previous interval"
        className={`${buttonClass} text-white`}
      >
        ◀◀
      </button>
      <button
        type="button"
        disabled={!timerLoaded}
        onClick={toggleTimer}
        aria-label={running ? 'Pause interval timer' : timerState.done ? 'Restart interval timer' : elapsed > 0 ? 'Resume interval timer' : 'Start interval timer'}
        className={`${buttonClass} bg-lime text-ink`}
      >
        {running ? 'Ⅱ Pause' : timerState.done ? '↻ Restart' : elapsed > 0 ? '▶ Resume' : '▶ Start'}
      </button>
      <button
        type="button"
        disabled={!timerLoaded}
        onClick={nextInterval}
        aria-label="Next interval"
        className={`${buttonClass} text-white`}
      >
        ▶▶
      </button>
    </div>
  );

  if (size === 'compact') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-[15px] font-black uppercase leading-none text-white">Intervals</p>
            <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-[.08em] text-[#8A8D84]">
              {partTitle} · {timer.rounds} × {formatTime(timer.work)} / {formatTime(timer.rest)}{timer.sets > 1 ? ` · ${timer.sets} sets` : ''}
            </p>
          </div>
          {soundControls}
        </div>

        <button
          type="button"
          disabled={!timerLoaded}
          onClick={toggleTimer}
          aria-label={running ? 'Pause interval timer' : timerState.done ? 'Restart interval timer' : 'Start interval timer'}
          className="flex min-h-[150px] flex-col items-center justify-center rounded-lg border border-white/10 bg-[#0B0C0A] px-3 py-4 text-center focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-lime/40"
        >
          <span className={`font-display text-[34px] font-black uppercase leading-[.9] ${phaseWordClass}`}>{phaseLabel}</span>
          <span className={`font-display text-[88px] font-black leading-[.86] tabular-nums ${phaseWordClass}`} style={{ color: phaseColor }}>
            {formatTime(timerState.segLeft, true)}
          </span>
        </button>

        <div className="flex gap-1" role="progressbar" aria-label="Round progress" aria-valuenow={Math.round(timerState.roundProgress[timerState.round - 1] * 100)} aria-valuemin={0} aria-valuemax={100}>
          {timerState.roundProgress.map((progress, index) => {
            const roundNumber = index + 1;
            const completed = timerState.done || phase === 'setrest' || (timerState.seg && roundNumber < timerState.round);
            const current = !completed && phase !== 'prep' && roundNumber === timerState.round;
            return (
              <div
                key={roundNumber}
                className="h-2 min-w-0 flex-1 overflow-hidden rounded-sm"
                style={{
                  background: completed
                    ? '#8A8D84'
                    : current
                      ? `linear-gradient(to right, ${phaseColor} ${Math.round(progress * 100)}%, #2A2C27 ${Math.round(progress * 100)}%)`
                      : '#2A2C27',
                }}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-[#2A2C27] pt-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8A8D84]">Round</p>
            <p className="font-display text-[40px] font-black leading-none tabular-nums text-white">
              {String(timerState.round).padStart(2, '0')}<span className="ml-1 text-[20px] text-[#8A8D84]">/ {timer.rounds}</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8A8D84]">Set</p>
            <p className="font-display text-[40px] font-black leading-none tabular-nums text-white">
              {timerState.set}<span className="ml-1 text-[20px] text-[#8A8D84]">/ {timer.sets}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-[#2A2C27] pt-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8A8D84]">Next</p>
            <p className="truncate font-display text-[20px] font-extrabold uppercase text-white">{nextLabel}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8A8D84]">Total left</p>
            <p className="font-display text-[24px] font-extrabold tabular-nums text-white">{remainingLabel}</p>
          </div>
        </div>

        {advanceAnnouncement && (
          <p className="rounded-lg bg-lime px-3 py-2 font-display text-[17px] font-extrabold uppercase text-ink">
            {advanceAnnouncement}
          </p>
        )}
        {controls}
      </div>
    );
  }

  const clock = currentTime || new Date();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 bg-ink px-10 py-[34px] text-white">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[30px] font-black uppercase leading-none">PURE</span>
        {soundControls}
        <time className="shrink-0 font-sans text-[24px] font-bold tabular-nums" dateTime={clock.toISOString()}>
          {format(clock, 'HH:mm')}
        </time>
      </div>

      <p className="truncate text-[20px] font-bold uppercase tracking-[.12em] text-[#8A8D84]">
        {partTitle} · {timer.rounds} × {formatTime(timer.work)} / {formatTime(timer.rest)}{timer.sets > 1 ? ` · ${timer.sets} sets` : ''}
      </p>

      <div className="min-w-0">
        <p className={`font-display text-[88px] font-black uppercase leading-[.88] ${phaseWordClass}`}>{phaseLabel}</p>
        <button
          type="button"
          disabled={!timerLoaded}
          onClick={toggleTimer}
          aria-label={running ? 'Pause interval timer' : timerState.done ? 'Restart interval timer' : 'Start interval timer'}
          className={`block w-full overflow-hidden text-left font-display text-[clamp(92px,9.15vw,176px)] font-black leading-[.82] tracking-[-.03em] tabular-nums focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-lime/40 ${phaseWordClass}`}
          style={{ color: phaseColor }}
        >
          {formatTime(timerState.segLeft, true)}
        </button>
      </div>

      <div className="flex h-[14px] gap-1" role="progressbar" aria-label="Round progress" aria-valuenow={Math.round(timerState.roundProgress[timerState.round - 1] * 100)} aria-valuemin={0} aria-valuemax={100}>
        {timerState.roundProgress.map((progress, index) => {
          const roundNumber = index + 1;
          const completed = timerState.done || phase === 'setrest' || (timerState.seg && roundNumber < timerState.round);
          const current = !completed && phase !== 'prep' && roundNumber === timerState.round;
          return (
            <div
              key={roundNumber}
              className="min-w-0 flex-1 overflow-hidden rounded-sm"
              style={{
                background: completed
                  ? '#8A8D84'
                  : current
                    ? `linear-gradient(to right, ${phaseColor} ${Math.round(progress * 100)}%, #2A2C27 ${Math.round(progress * 100)}%)`
                    : '#2A2C27',
              }}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 border-t-2 border-[#2A2C27] pt-5">
        <div>
          <p className="text-[20px] font-bold uppercase tracking-[.16em] text-[#8A8D84]">Round</p>
          <p className="font-display text-[72px] font-black leading-none tabular-nums text-white">
            {String(timerState.round).padStart(2, '0')}<span className="ml-2 text-[40px] text-[#8A8D84]">/ {timer.rounds}</span>
          </p>
        </div>
        <div>
          <p className="text-[20px] font-bold uppercase tracking-[.16em] text-[#8A8D84]">Set</p>
          <p className="font-display text-[72px] font-black leading-none tabular-nums text-white">
            {timerState.set}<span className="ml-2 text-[40px] text-[#8A8D84]">/ {timer.sets}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[20px] font-bold uppercase tracking-[.16em] text-[#8A8D84]">Next</p>
          <p className="truncate font-display text-[40px] font-extrabold uppercase leading-tight text-white">{nextLabel}</p>
        </div>
        <div>
          <p className="text-[20px] font-bold uppercase tracking-[.16em] text-[#8A8D84]">Total left</p>
          <p className="font-display text-[40px] font-extrabold leading-tight tabular-nums text-white">{remainingLabel}</p>
        </div>
      </div>

      {advanceAnnouncement && (
        <p className="rounded-lg bg-lime px-3 py-2 font-display text-[20px] font-extrabold uppercase text-ink">
          {advanceAnnouncement}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-5">
        <div className={`transition-opacity ${controlsShowing ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          {controls}
        </div>
        {stageFooter?.({ elapsedSeconds: elapsed, partProgress })}
      </div>
    </div>
  );
}
