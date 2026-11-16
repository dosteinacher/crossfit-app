'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { buildTimeline, cueAt, stateAt, type Phase, type TimerCue } from '@/lib/intervalTimer';
import {
  getIntervalTimerStorageKey,
  restoreIntervalTimerState,
  type PersistedIntervalTimer,
} from '@/lib/intervalTimerPersistence';
import type { WorkoutPart } from '@/lib/workoutNotation';
import BoardTimerSetup from '@/components/BoardTimerSetup';
import {
  boardTimerConfigurationsEqual,
  getBoardTimerConfigurationDuration,
  getBoardTimerCue,
  getBoardTimerOverrideStorageKey,
  getDefaultBoardTimerConfiguration,
  isBoardTimerConfiguration,
  type BoardTimerConfiguration,
} from '@/lib/boardTimer';

type Volume = 'low' | 'medium' | 'high';

const SOUND_STORAGE_KEY = 'pure.board.sound';
const VOLUME_STORAGE_KEY = 'pure.board.volume';
const VOLUME_GAIN: Record<Volume, number> = { low: 0.07, medium: 0.18, high: 0.36 };

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

export default function TimerPanel({
  size,
  workoutId,
  partIndex,
  part,
  upcomingPartTitle,
  currentTime,
  controlsDimmed = false,
  coreControlsVisible = true,
  onActivity,
  onAutoAdvance,
  stageFooter,
}: {
  size: 'stage' | 'compact';
  workoutId: number | string;
  partIndex: number;
  part: WorkoutPart;
  upcomingPartTitle?: string;
  currentTime?: Date;
  controlsDimmed?: boolean;
  coreControlsVisible?: boolean;
  onActivity?: () => void;
  onAutoAdvance?: () => void;
  stageFooter?: (state: { elapsedSeconds: number; partProgress: number }) => ReactNode;
}) {
  const storageKey = getIntervalTimerStorageKey(workoutId, partIndex);
  const overrideStorageKey = getBoardTimerOverrideStorageKey(workoutId, partIndex);
  const defaultConfiguration = useMemo(() => getDefaultBoardTimerConfiguration(part), [part]);
  const [timerOverride, setTimerOverride] = useState<BoardTimerConfiguration | null>(null);
  const [overrideLoaded, setOverrideLoaded] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const configuration = timerOverride || defaultConfiguration;
  const mode = configuration.mode;
  const timer = mode === 'intervals' ? configuration.timer : undefined;
  const duration = mode === 'intervals' ? undefined : getBoardTimerConfigurationDuration(configuration);
  const { end: intervalEnd } = useMemo(
    () => timer ? buildTimeline(timer) : { segs: [], end: 0 },
    [timer]
  );
  const end = mode === 'intervals' ? intervalEnd : duration ?? Number.MAX_SAFE_INTEGER;
  const [accumulated, setAccumulated] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [timerLoaded, setTimerLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState<Volume>('medium');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWarningRef = useRef(false);
  const lastCueElapsedRef = useRef<number | null>(null);
  const advanceRef = useRef(onAutoAdvance);
  const skipTimerRestoreRef = useRef(false);

  const elapsed = Math.min(end, accumulated + (running && startedAt !== null
    ? Math.max(0, Math.floor((now - startedAt) / 1000))
    : 0));
  const timerState = useMemo(() => timer ? stateAt(timer, elapsed) : undefined, [elapsed, timer]);
  const done = timerState?.done ?? (duration !== undefined && elapsed >= duration);
  const phase = timerState?.done ? undefined : timerState?.seg?.phase;
  const phaseStyle = phase ? PHASE_STYLE[phase] : undefined;
  const phaseLabel = phaseStyle?.label || (
    done ? 'DONE' : mode === 'countup' ? 'COUNT UP' : mode === 'countdown' ? 'COUNTDOWN' : mode === 'emom' ? 'EMOM' : 'INTERVALS'
  );
  const phaseColor = phaseStyle?.color || '#FFFFFF';
  const nextLabel = done
    ? 'NEXT PART'
    : timerState?.next
      ? `${PHASE_STYLE[timerState.next.phase].label} ${formatTime(timerState.next.dur)}`
      : mode === 'emom' ? `NEXT ${configuration.everyMinutes === 1 ? 'MINUTE' : 'ROUND'}` : duration === undefined ? 'NO CAP' : 'FINISH';
  const totalLeft = timerState?.totalLeft ?? (
    duration === undefined ? 0 : Math.max(0, duration - elapsed)
  );
  const partProgress = done
    ? 1
    : duration !== undefined
      ? Math.max(0, Math.min(1, elapsed / Math.max(1, duration)))
      : 0;
  const advanceAnnouncement = done && upcomingPartTitle && onAutoAdvance
    ? `NEXT: ${String(partIndex + 2).padStart(2, '0')} ${upcomingPartTitle}`
    : '';
  const displayTime = mode === 'intervals'
    ? formatTime(timerState?.segLeft || 0, true)
    : mode === 'countdown'
      ? formatTime(Math.max(0, (duration || 0) - elapsed), true)
      : mode === 'emom'
        ? formatTime(elapsed >= (duration || 0) ? 0 : ((configuration.everyMinutes || 1) * 60) - (elapsed % ((configuration.everyMinutes || 1) * 60)), true)
        : formatTime(elapsed, true);
  const emomMinute = mode === 'emom'
    ? Math.min(configuration.minutes || 1, Math.floor(elapsed / ((configuration.everyMinutes || 1) * 60)) + 1)
    : 0;

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(overrideStorageKey);
        if (raw) {
          const saved: unknown = JSON.parse(raw);
          if (isBoardTimerConfiguration(saved)) {
            setTimerOverride(saved);
          } else {
            console.warn('Ignoring malformed board timer override:', overrideStorageKey);
            setTimerOverride(null);
          }
        } else {
          setTimerOverride(null);
        }
      } catch (storageError) {
        console.warn('Could not restore board timer override:', storageError);
        setTimerOverride(null);
      }
      setOverrideLoaded(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [overrideStorageKey]);

  useEffect(() => {
    if (!overrideLoaded) return;
    if (skipTimerRestoreRef.current) {
      skipTimerRestoreRef.current = false;
      return;
    }
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
  }, [end, overrideLoaded, storageKey]);

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

  const ensureAudioContext = useCallback(() => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
      }
      if (audioContextRef.current.state === 'suspended') {
        void audioContextRef.current.resume().catch((audioError: unknown) => {
          if (!audioWarningRef.current) {
            audioWarningRef.current = true;
            console.warn('Interval timer audio is unavailable:', audioError);
          }
        });
      }
      return audioContextRef.current;
    } catch (audioError) {
      if (!audioWarningRef.current) {
        audioWarningRef.current = true;
        console.warn('Interval timer audio is unavailable:', audioError);
      }
      return null;
    }
  }, []);

  useEffect(() => () => {
    const audio = audioContextRef.current;
    audioContextRef.current = null;
    if (audio && audio.state !== 'closed') {
      void audio.close().catch((audioError: unknown) => {
        if (!audioWarningRef.current) {
          audioWarningRef.current = true;
          console.warn('Could not close interval timer audio:', audioError);
        }
      });
    }
  }, []);

  const playCue = useCallback((cue: TimerCue, secondsLeft: number) => {
    if (!preferencesLoaded || !soundEnabled) return;
    const audio = ensureAudioContext();
    if (!audio) return;

    const notes = cue === 'finish'
      ? [{ frequency: 880, delay: 0 }, { frequency: 1046, delay: 0.18 }, { frequency: 1318, delay: 0.36 }]
      : [{
        frequency: cue === 'phaseStart-work'
          ? 880
          : cue === 'phaseStart-rest'
            ? 520
            : 520 + (4 - secondsLeft) * 80,
        delay: 0,
      }];
    const duration = cue === 'tick' ? 0.08 : cue === 'finish' ? 0.16 : 0.18;
    const start = audio.currentTime;

    notes.forEach(({ frequency, delay }) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const noteStart = start + delay;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(VOLUME_GAIN[volume], noteStart + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + duration);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }, [ensureAudioContext, preferencesLoaded, soundEnabled, volume]);

  useEffect(() => {
    if (!timerLoaded || !preferencesLoaded || !running) return;
    let cue: { cue: TimerCue; secondsLeft: number } | null = null;
    if (mode === 'intervals' && timer) {
      const intervalCue = cueAt(timer, elapsed);
      if (intervalCue) cue = { cue: intervalCue, secondsLeft: timerState?.segLeft || 0 };
    } else {
      cue = getBoardTimerCue(configuration, elapsed);
    }
    if (!cue || lastCueElapsedRef.current === elapsed) return;
    lastCueElapsedRef.current = elapsed;
    playCue(cue.cue, cue.secondsLeft);
  }, [configuration, elapsed, mode, playCue, preferencesLoaded, running, timer, timerLoaded, timerState?.segLeft]);

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
    if (!timerLoaded || !running || !done) return;
    const frameId = window.requestAnimationFrame(() => {
      setAccumulated(end);
      setStartedAt(null);
      setRunning(false);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [done, end, running, timerLoaded]);

  useEffect(() => {
    advanceRef.current = onAutoAdvance;
  }, [onAutoAdvance]);

  useEffect(() => {
    if (!timerLoaded || !done || (mode !== 'intervals' && duration === undefined) || !upcomingPartTitle || !onAutoAdvance) return;
    const timeoutId = window.setTimeout(() => advanceRef.current?.(), 10_000);
    return () => window.clearTimeout(timeoutId);
  }, [done, duration, mode, onAutoAdvance, partIndex, timerLoaded, upcomingPartTitle]);

  const liveElapsed = useCallback(() => (
    running && startedAt !== null
      ? accumulated + Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      : accumulated
  ), [accumulated, running, startedAt]);

  const setPosition = useCallback((position: number) => {
    const timestamp = Date.now();
    const nextElapsed = Math.max(0, Math.min(end, position));
    lastCueElapsedRef.current = null;
    setAccumulated(nextElapsed);
    setStartedAt(running ? timestamp : null);
    setNow(timestamp);
  }, [end, running]);

  const toggleTimer = useCallback(() => {
    if (!timerLoaded || !preferencesLoaded) return;
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
    if (soundEnabled && preferencesLoaded) ensureAudioContext();
    setAccumulated(done ? 0 : elapsed);
    setStartedAt(timestamp);
    setRunning(true);
    setNow(timestamp);
  }, [done, elapsed, end, ensureAudioContext, liveElapsed, onActivity, preferencesLoaded, running, soundEnabled, timerLoaded]);

  const stopTimer = useCallback(() => {
    if (!timerLoaded || !preferencesLoaded) return;
    onActivity?.();
    lastCueElapsedRef.current = null;
    setAccumulated(0);
    setStartedAt(null);
    setRunning(false);
    setNow(Date.now());
  }, [onActivity, preferencesLoaded, timerLoaded]);

  const previousInterval = useCallback(() => {
    onActivity?.();
    if (mode !== 'intervals' || !timer) {
      setPosition(liveElapsed() - 60);
      return;
    }
    const { segs } = buildTimeline(timer);
    const index = timerState?.index ?? -1;
    if (!segs.length) return;
    if (done) {
      setPosition(segs[segs.length - 1].start);
      return;
    }
    const current = segs[index];
    if (!current) return;
    const currentStart = index === 0 || liveElapsed() - current.start > 2
      ? current.start
      : segs[index - 1].start;
    setPosition(currentStart);
  }, [done, liveElapsed, mode, onActivity, setPosition, timer, timerState?.index]);

  const nextInterval = useCallback(() => {
    onActivity?.();
    if (mode !== 'intervals' || !timer) {
      setPosition(liveElapsed() + 60);
      return;
    }
    if (done) return;
    const { segs, end: timelineEnd } = buildTimeline(timer);
    setPosition(segs[(timerState?.index ?? -1) + 1]?.start ?? timelineEnd);
  }, [done, liveElapsed, mode, onActivity, setPosition, timer, timerState?.index]);

  const toggleSound = useCallback(() => {
    onActivity?.();
    if (!soundEnabled) ensureAudioContext();
    setSoundEnabled(!soundEnabled);
  }, [ensureAudioContext, onActivity, soundEnabled]);

  const applyConfiguration = useCallback((nextConfiguration: BoardTimerConfiguration, start: boolean) => {
    const nextOverride = boardTimerConfigurationsEqual(nextConfiguration, defaultConfiguration)
      ? null
      : nextConfiguration;
    try {
      if (nextOverride) {
        localStorage.setItem(overrideStorageKey, JSON.stringify(nextOverride));
      } else {
        localStorage.removeItem(overrideStorageKey);
      }
    } catch (storageError) {
      console.warn('Could not persist board timer override:', storageError);
    }

    const timestamp = Date.now();
    skipTimerRestoreRef.current = true;
    lastCueElapsedRef.current = null;
    setTimerOverride(nextOverride);
    setAccumulated(0);
    setStartedAt(start ? timestamp : null);
    setRunning(start);
    setNow(timestamp);
    setSetupOpen(false);
    if (start) {
      onActivity?.();
      if (soundEnabled) ensureAudioContext();
    }
  }, [defaultConfiguration, ensureAudioContext, onActivity, overrideStorageKey, soundEnabled]);

  const finishSetup = useCallback((nextConfiguration: BoardTimerConfiguration) => {
    if (boardTimerConfigurationsEqual(nextConfiguration, configuration)) {
      setSetupOpen(false);
      return;
    }
    applyConfiguration(nextConfiguration, false);
  }, [applyConfiguration, configuration]);

  const resetOverride = useCallback(() => {
    try {
      localStorage.removeItem(overrideStorageKey);
    } catch (storageError) {
      console.warn('Could not reset board timer override:', storageError);
    }
    skipTimerRestoreRef.current = true;
    lastCueElapsedRef.current = null;
    setTimerOverride(null);
    setAccumulated(0);
    setStartedAt(null);
    setRunning(false);
    setNow(Date.now());
  }, [overrideStorageKey]);

  const timerControlsReady = timerLoaded && preferencesLoaded && overrideLoaded;
  const showSetup = setupOpen && (size !== 'stage' || coreControlsVisible);
  const stageControlVisibility = size === 'stage'
    ? `${coreControlsVisible ? '' : 'hidden'} transition-opacity ${controlsDimmed ? 'opacity-[.35]' : 'opacity-100'}`
    : '';
  const setupControls = (
    <div className={`flex min-w-0 items-center gap-2 ${stageControlVisibility}`}>
      {timerOverride && (
        <div className="flex min-w-0 items-center gap-1 rounded-full border border-lime/50 px-2 py-1 text-[9px] font-bold uppercase tracking-[.08em] text-lime">
          <span className="truncate">EDITED ON BOARD ·</span>
          <button type="button" disabled={!timerControlsReady} onClick={() => { onActivity?.(); resetOverride(); }} className="min-h-12 shrink-0 underline underline-offset-2 disabled:opacity-50">RESET</button>
        </div>
      )}
      <button
        type="button"
        disabled={!timerControlsReady}
        onClick={() => { onActivity?.(); setSetupOpen(true); }}
        aria-label={timerOverride ? 'Edit timer setup' : 'Set timer'}
        className="min-h-12 shrink-0 rounded-lg border border-[#3A3C36] px-2 font-display text-[12px] font-extrabold uppercase text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime disabled:opacity-50"
      >
        {timerOverride ? 'TIMER ✎' : '⏱ SET TIMER'}
      </button>
    </div>
  );
  const renderSetup = () => (
    <BoardTimerSetup
      initialConfiguration={configuration}
      partTitle={part.title || 'Workout'}
      onStart={(nextConfiguration) => applyConfiguration(nextConfiguration, true)}
      onDone={finishSetup}
    />
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const targetElement = target instanceof HTMLElement ? target : null;
      if (!timerLoaded || !preferencesLoaded || targetElement?.closest('input, textarea, [contenteditable="true"]')) return;
      if (event.key.toLowerCase() === 't') {
        event.preventDefault();
        onActivity?.();
        setSetupOpen((open) => !open);
      } else if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        toggleSound();
      } else if (event.key === '[') {
        event.preventDefault();
        previousInterval();
      } else if (event.key === ']') {
        event.preventDefault();
        nextInterval();
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        stopTimer();
      } else if (event.key === 'OK' || ((event.key === ' ' || event.key === 'Enter') && !targetElement?.closest('button, select, a'))) {
        event.preventDefault();
        toggleTimer();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nextInterval, onActivity, preferencesLoaded, previousInterval, stopTimer, timerLoaded, toggleSound, toggleTimer]);

  const phaseWordClass = phaseStyle?.className || 'text-white';
  const remainingLabel = duration === undefined && mode !== 'intervals' ? '—' : formatTime(totalLeft);
  const roundProgress = timerState?.roundProgress || [];
  const currentRound = timerState?.round || 1;
  const currentSet = timerState?.set || 1;
  const modeTitle = mode === 'countup' && duration !== undefined
    ? `TIME CAP · ${configuration.minutes}′`
    : mode === 'intervals'
      ? 'INTERVALS'
      : mode === 'countup'
        ? 'COUNT UP'
        : mode === 'countdown'
          ? 'COUNTDOWN'
          : 'EMOM';
  const partSummary = timer
    ? `${timer.rounds} × ${formatTime(timer.work)} / ${formatTime(timer.rest)}${timer.sets > 1 ? ` · ${timer.sets} sets` : ''}`
    : part.format === 'AMRAP'
      ? `${part.minutes || 'Set duration'} minute AMRAP`
      : part.format === 'EMOM'
        ? `${part.minutes || 'Set duration'} minute EMOM`
        : part.format === 'FOR TIME' || part.format === 'CHIPPER'
            ? part.minutes ? part.format : 'No time cap'
          : part.format || 'Stopwatch';
  const startLabel = running ? 'Ⅱ Pause' : done ? '↻ Restart' : elapsed > 0 ? '▶ Resume' : '▶ Start';
  const timeButtonLabel = running ? 'Pause timer' : done ? 'Restart timer' : elapsed > 0 ? 'Resume timer' : 'Start timer';
  const buttonClass = size === 'stage'
    ? 'h-[68px] rounded-xl bg-[#1E1F1B] font-display text-[22px] font-black uppercase'
    : 'h-12 rounded-lg bg-[#1E1F1B] font-display text-[15px] font-black uppercase';
  const soundControls = (
    <div className={`flex items-center gap-2 ${stageControlVisibility}`}>
      <button
        type="button"
        onClick={toggleSound}
        disabled={!preferencesLoaded}
        aria-label={soundEnabled ? 'Turn sound off' : 'Turn sound on'}
        aria-pressed={soundEnabled}
        className={`min-h-12 shrink-0 rounded-lg border px-3 py-2 font-display text-[15px] font-extrabold uppercase leading-none ${
          soundEnabled ? 'border-lime text-lime' : 'border-[#3A3C36] text-[#8A8D84]'
        }`}
      >
        {soundEnabled ? '🔊 Sound on' : '🔇 Sound off'}
      </button>
      <select
        aria-label="Sound volume"
        disabled={!preferencesLoaded}
        value={volume}
        onChange={(event) => {
          const value = event.target.value;
          if (value === 'low' || value === 'medium' || value === 'high') setVolume(value);
          onActivity?.();
        }}
        className="min-h-12 rounded-lg border border-[#3A3C36] bg-[#1E1F1B] px-2 text-[12px] font-bold uppercase text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
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
        disabled={!timerControlsReady}
        onClick={stopTimer}
        aria-label="Stop interval timer"
        className={`${buttonClass} text-[#FF8A1F]`}
      >
        Stop
      </button>
      <button
        type="button"
        disabled={!timerControlsReady}
        onClick={previousInterval}
        aria-label="Previous interval"
        className={`${buttonClass} text-white`}
      >
        ◀◀
      </button>
      <button
        type="button"
        disabled={!timerControlsReady}
        onClick={toggleTimer}
        aria-label={timeButtonLabel}
        className={`${buttonClass} bg-lime text-ink`}
      >
        {startLabel}
      </button>
      <button
        type="button"
        disabled={!timerControlsReady}
        onClick={nextInterval}
        aria-label="Next interval"
        className={`${buttonClass} text-white`}
      >
        ▶▶
      </button>
    </div>
  );

  const compactContent = () => (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-[15px] font-black uppercase leading-none text-white">{modeTitle}</p>
            <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-[.08em] text-[#8A8D84]">
              {part.title} · {partSummary}
            </p>
          </div>
            {setupControls}
          </div>
          <div className="flex justify-end">{soundControls}</div>
        </div>

        <button
          type="button"
          disabled={!timerControlsReady}
          onClick={toggleTimer}
          aria-label={timeButtonLabel}
          className="flex min-h-[150px] flex-col items-center justify-center rounded-lg border border-white/10 bg-[#0B0C0A] px-3 py-4 text-center focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-lime/40"
        >
          {mode === 'emom' && (
            <span className="font-display text-[28px] font-black uppercase leading-[.9] text-[#8A8D84]">
              {String(emomMinute).padStart(2, '0')} / {configuration.minutes || 1}
            </span>
          )}
          <span className={`font-display text-[clamp(1.75rem,9cqw,2.125rem)] font-black uppercase leading-[.9] ${phaseWordClass}`} aria-live="polite" aria-atomic="true">{phaseLabel}</span>
          <span className={`font-display text-[clamp(3.25rem,22cqw,5.5rem)] font-black leading-[.86] tabular-nums ${phaseWordClass}`} style={{ color: phaseColor }}>
            {displayTime}
          </span>
        </button>

        {timerState ? (
          <div className="flex gap-1" role="progressbar" aria-label="Round progress" aria-valuenow={Math.round(roundProgress[currentRound - 1] * 100)} aria-valuemin={0} aria-valuemax={100}>
            {roundProgress.map((progress, index) => {
              const roundNumber = index + 1;
              const completed = timerState.done || phase === 'setrest' || (timerState.seg && roundNumber < currentRound);
              const current = !completed && phase !== 'prep' && roundNumber === currentRound;
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
        ) : duration !== undefined && (
          <div className="h-2 overflow-hidden rounded-sm bg-[#2A2C27]" role="progressbar" aria-label="Timer progress" aria-valuenow={Math.round(partProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-lime" style={{ width: `${partProgress * 100}%` }} />
          </div>
        )}

        {timerState ? (
          <div className="grid grid-cols-2 gap-3 border-t border-[#2A2C27] pt-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8A8D84]">Round</p>
              <p className="font-display text-[clamp(1.875rem,10cqw,2.5rem)] font-black leading-none tabular-nums text-white">
                {String(currentRound).padStart(2, '0')}<span className="ml-1 text-[20px] text-[#8A8D84]">/ {timer?.rounds}</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8A8D84]">Set</p>
              <p className="font-display text-[clamp(1.875rem,10cqw,2.5rem)] font-black leading-none tabular-nums text-white">
                {currentSet}<span className="ml-1 text-[20px] text-[#8A8D84]">/ {timer?.sets}</span>
              </p>
            </div>
          </div>
        ) : mode === 'emom' ? (
          <div className="border-t border-[#2A2C27] pt-3">
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8A8D84]">Minute</p>
            <p className="font-display text-[clamp(1.875rem,10cqw,2.5rem)] font-black leading-none tabular-nums text-white">
              {String(emomMinute).padStart(2, '0')}<span className="ml-1 text-[20px] text-[#8A8D84]">/ {configuration.minutes || 1}</span>
            </p>
          </div>
        ) : null}

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

  if (size === 'compact') {
    return (
      <>
        <div className="board-compact-desktop">
          {setupOpen ? renderSetup() : compactContent()}
        </div>
        <div className="board-timer-mobile-bar">
          <button
            type="button"
            className="board-timer-mobile-summary"
            onClick={() => setMobileExpanded(true)}
            aria-label="Expand timer panel"
            aria-expanded={mobileExpanded}
          >
            <span className="block truncate text-[11px] font-extrabold uppercase tracking-[.12em] text-[#C9CBC4]">
              {mode === 'intervals' ? phaseLabel : modeTitle}
            </span>
            <span className="block font-display text-[32px] font-black leading-none tabular-nums text-white">{displayTime}</span>
            {mode === 'intervals' && timer ? (
              <span className="text-[11px] font-bold tabular-nums text-[#C9CBC4]">R {String(currentRound).padStart(2, '0')}/{timer.rounds}</span>
            ) : mode === 'emom' ? (
              <span className="text-[11px] font-bold tabular-nums text-[#C9CBC4]">{String(emomMinute).padStart(2, '0')}/{configuration.minutes || 1}</span>
            ) : null}
          </button>
          <button
            type="button"
            disabled={!timerControlsReady}
            onClick={toggleTimer}
            aria-label={timeButtonLabel}
            className="board-timer-mobile-start"
          >
            {running ? 'Ⅱ' : '▶'}
          </button>
        </div>
        {mobileExpanded && (
          <div className="board-timer-sheet-overlay">
            <button
              type="button"
              className="board-timer-sheet-backdrop"
              onClick={() => setMobileExpanded(false)}
              aria-label="Close timer panel"
            />
            <section
              className={`board-timer-sheet ${setupOpen ? 'board-timer-sheet-setup-open' : ''}`}
              role="dialog"
              aria-modal="true"
              aria-label={setupOpen ? 'Timer setup' : 'Timer panel'}
            >
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMobileExpanded(false)}
                  aria-label="Close timer panel"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 text-2xl font-bold text-white"
                >
                  ×
                </button>
              </div>
              {setupOpen ? renderSetup() : compactContent()}
            </section>
          </div>
        )}
      </>
    );
  }

  const clock = currentTime || new Date();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 bg-ink px-10 py-[34px] text-white">
      {showSetup ? renderSetup() : (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-[30px] font-black uppercase leading-none">PURE</span>
            {soundControls}
            <time className="shrink-0 font-sans text-[24px] font-bold tabular-nums" dateTime={clock.toISOString()}>
              {format(clock, 'HH:mm')}
            </time>
          </div>

          <div className="flex min-w-0 items-center justify-between gap-3">
            <p className="truncate text-[20px] font-bold uppercase tracking-[.12em] text-[#8A8D84]">
              {part.title} · {modeTitle} · {partSummary}
            </p>
            {setupControls}
          </div>

          <div className="min-w-0">
        {mode === 'emom' && (
          <p className="mb-2 font-display text-[38px] font-black uppercase leading-none text-[#8A8D84]">
            {String(emomMinute).padStart(2, '0')} / {configuration.minutes || 1}
          </p>
        )}
        <p className={`font-display text-[88px] font-black uppercase leading-[.88] ${phaseWordClass}`} aria-live="polite" aria-atomic="true">{phaseLabel}</p>
        <button
          type="button"
          disabled={!timerControlsReady}
          onClick={toggleTimer}
          aria-label={timeButtonLabel}
          className={`block w-full overflow-hidden text-left font-display text-[clamp(52px,32.6cqw,176px)] font-black leading-[.82] tracking-[-.03em] tabular-nums focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-lime/40 ${phaseWordClass}`}
          style={{ color: phaseColor }}
        >
          {displayTime}
        </button>
      </div>

      {timerState ? (
        <div className="flex h-[14px] gap-1" role="progressbar" aria-label="Round progress" aria-valuenow={Math.round(roundProgress[currentRound - 1] * 100)} aria-valuemin={0} aria-valuemax={100}>
          {roundProgress.map((progress, index) => {
            const roundNumber = index + 1;
            const completed = timerState.done || phase === 'setrest' || (timerState.seg && roundNumber < currentRound);
            const current = !completed && phase !== 'prep' && roundNumber === currentRound;
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
      ) : duration !== undefined && (
        <div className="h-[14px] overflow-hidden rounded-sm bg-[#2A2C27]" role="progressbar" aria-label="Timer progress" aria-valuenow={Math.round(partProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-lime" style={{ width: `${partProgress * 100}%` }} />
        </div>
      )}

      {timerState ? (
        <div className="grid grid-cols-2 gap-4 border-t-2 border-[#2A2C27] pt-5">
          <div>
            <p className="text-[20px] font-bold uppercase tracking-[.16em] text-[#8A8D84]">Round</p>
            <p className="font-display text-[72px] font-black leading-none tabular-nums text-white">
              {String(currentRound).padStart(2, '0')}<span className="ml-2 text-[40px] text-[#8A8D84]">/ {timer?.rounds}</span>
            </p>
          </div>
          <div>
            <p className="text-[20px] font-bold uppercase tracking-[.16em] text-[#8A8D84]">Set</p>
            <p className="font-display text-[72px] font-black leading-none tabular-nums text-white">
              {currentSet}<span className="ml-2 text-[40px] text-[#8A8D84]">/ {timer?.sets}</span>
            </p>
          </div>
        </div>
      ) : mode === 'emom' && (
        <div className="border-t-2 border-[#2A2C27] pt-5">
          <p className="text-[20px] font-bold uppercase tracking-[.16em] text-[#8A8D84]">Minute</p>
          <p className="font-display text-[72px] font-black leading-none tabular-nums text-white">
            {String(emomMinute).padStart(2, '0')}<span className="ml-2 text-[40px] text-[#8A8D84]">/ {configuration.minutes || 1}</span>
          </p>
        </div>
      )}

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
            <div className={`${coreControlsVisible ? '' : 'hidden'} transition-opacity ${controlsDimmed ? 'opacity-[.35]' : 'opacity-100'}`}>
              {controls}
            </div>
            {stageFooter?.({ elapsedSeconds: elapsed, partProgress })}
          </div>
        </>
      )}
    </div>
  );
}
