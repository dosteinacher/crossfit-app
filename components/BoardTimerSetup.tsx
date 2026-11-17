'use client';

import { useState } from 'react';
import { buildTimeline } from '@/lib/intervalTimer';
import type { BoardTimerConfiguration, BoardTimerMode } from '@/lib/boardTimer';
import {
  DEFAULT_INTERVAL_TIMER,
  INTERVAL_TIMER_PRESETS,
  TimerStepper,
} from '@/components/IntervalTimerSetup';
import type { IntervalTimer } from '@/lib/workoutNotation';

const MODES: Array<{ value: BoardTimerMode; label: string }> = [
  { value: 'countup', label: 'COUNT UP' },
  { value: 'countdown', label: 'COUNTDOWN' },
  { value: 'emom', label: 'EMOM' },
  { value: 'intervals', label: 'INTERVALS' },
];

function formatTime(seconds: number, padMinutes = false) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  return `${padMinutes ? String(minutes).padStart(2, '0') : minutes}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

function totalFor(configuration: BoardTimerConfiguration) {
  switch (configuration.mode) {
    case 'countup':
      return configuration.minutes && configuration.minutes > 0 ? configuration.minutes * 60 : undefined;
    case 'countdown':
      return (configuration.minutes || 0) * 60;
    case 'emom':
      return (configuration.minutes || 0) * (configuration.everyMinutes || 1) * 60;
    case 'intervals':
      return configuration.timer
        ? buildTimeline(configuration.timer).end - configuration.timer.prep
        : 0;
  }
}

function summaryFor(configuration: BoardTimerConfiguration) {
  switch (configuration.mode) {
    case 'countup':
      return configuration.minutes ? `Count up · ${configuration.minutes} minute cap` : 'Count up · no time cap';
    case 'countdown':
      return `Countdown · ${configuration.minutes} minutes`;
    case 'emom':
      return `EMOM · ${configuration.minutes} rounds every ${configuration.everyMinutes}:00`;
    case 'intervals': {
      const timer = configuration.timer;
      if (!timer) return 'Intervals';
      return `${timer.rounds} rounds · ${formatTime(timer.work)} work / ${formatTime(timer.rest)} rest${timer.sets > 1 ? ` · ${timer.sets} sets` : ''}`;
    }
  }
}

export default function BoardTimerSetup({
  initialConfiguration,
  partTitle,
  onStart,
  onDone,
}: {
  initialConfiguration: BoardTimerConfiguration;
  partTitle: string;
  onStart: (configuration: BoardTimerConfiguration) => void;
  onDone: (configuration: BoardTimerConfiguration) => void;
}) {
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const totalTime = totalFor(configuration);

  const setMode = (mode: BoardTimerMode) => {
    setConfiguration((current) => {
      if (mode === 'intervals') return { mode, timer: current.timer || { ...DEFAULT_INTERVAL_TIMER } };
      if (mode === 'countup') return { mode, minutes: current.minutes ?? 0 };
      if (mode === 'countdown') {
        return { mode, minutes: current.minutes && current.minutes > 0 ? current.minutes : 12 };
      }
      return {
        mode,
        minutes: current.minutes && current.minutes > 0 ? current.minutes : 12,
        everyMinutes: current.everyMinutes || 1,
      };
    });
  };

  const setMinutes = (amount: number, minimum: number, maximum: number) => {
    setConfiguration((current) => ({
      ...current,
      minutes: Math.max(minimum, Math.min(maximum, (current.minutes || 0) + amount)),
    }));
  };

  const setIntervalValue = (key: keyof IntervalTimer, amount: number, minimum: number, maximum: number) => {
    setConfiguration((current) => {
      if (current.mode !== 'intervals' || !current.timer) return current;
      return {
        ...current,
        timer: {
          ...current.timer,
          [key]: Math.max(minimum, Math.min(maximum, current.timer[key] + amount)),
        },
      };
    });
  };

  const activeTimer = configuration.mode === 'intervals' ? configuration.timer : undefined;

  return (
    <div className="board-timer-setup">
      <header className="mb-2 flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-[24px] font-black uppercase leading-none text-white">Set timer</h2>
          <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-[.08em] text-[#8A8D84]">{partTitle}</p>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Timer mode">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            aria-pressed={configuration.mode === mode.value}
            onClick={() => setMode(mode.value)}
            className={`min-h-12 rounded-lg border px-1 font-display text-[clamp(10px,2.6cqw,14px)] font-extrabold uppercase leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime ${
              configuration.mode === mode.value
                ? 'border-lime bg-lime text-ink'
                : 'border-[#3A3C36] text-white'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="board-timer-setup-fields">
        <div className="border-t border-[#2A2C27]">
          {configuration.mode === 'countup' && (
            <TimerStepper
              label="Cap"
              helperText="Optional limit · Off counts up"
              value={configuration.minutes || 0}
              displayValue={configuration.minutes ? `${configuration.minutes} min` : 'Off'}
              step={1}
              minimum={0}
              maximum={300}
              onStep={(amount) => setMinutes(amount, 0, 300)}
            />
          )}

          {configuration.mode === 'countdown' && (
            <TimerStepper
              label="Minutes"
              helperText="Countdown duration"
              value={configuration.minutes || 1}
              displayValue={`${configuration.minutes} min`}
              step={1}
              minimum={1}
              maximum={300}
              onStep={(amount) => setMinutes(amount, 1, 300)}
            />
          )}

          {configuration.mode === 'emom' && (
            <>
              <TimerStepper
                label="Rounds"
                helperText="Total minutes / rounds"
                value={configuration.minutes || 1}
                displayValue={String(configuration.minutes)}
                step={1}
                minimum={1}
                maximum={50}
                onStep={(amount) => setMinutes(amount, 1, 50)}
              />
              <TimerStepper
                label="Every N:00"
                helperText="Time between each round"
                value={configuration.everyMinutes || 1}
                displayValue={`${configuration.everyMinutes}:00`}
                step={1}
                minimum={1}
                maximum={10}
                onStep={(amount) => setConfiguration((current) => ({
                  ...current,
                  everyMinutes: Math.max(1, Math.min(10, (current.everyMinutes || 1) + amount)),
                }))}
              />
            </>
          )}

          {configuration.mode === 'intervals' && activeTimer && (
            <>
              <div className="flex flex-wrap gap-1.5 border-b border-[#2A2C27] py-2">
                {INTERVAL_TIMER_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setConfiguration({ mode: 'intervals', timer: { ...preset.timer } })}
                    className="min-h-12 rounded-full border border-[#3A3C36] px-2.5 font-display text-[12px] font-extrabold uppercase text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <TimerStepper
                label="Rounds"
                helperText="Work + rest = one round"
                value={activeTimer.rounds}
                displayValue={String(activeTimer.rounds)}
                step={1}
                minimum={1}
                maximum={50}
                onStep={(amount) => setIntervalValue('rounds', amount, 1, 50)}
              />
              <TimerStepper
                label="Work"
                helperText="Seconds per work interval"
                value={activeTimer.work}
                displayValue={formatTime(activeTimer.work)}
                step={5}
                minimum={5}
                maximum={600}
                onStep={(amount) => setIntervalValue('work', amount, 5, 600)}
              />
              <TimerStepper
                label="Rest"
                helperText="Between rounds · none after the last"
                value={activeTimer.rest}
                displayValue={formatTime(activeTimer.rest)}
                step={5}
                minimum={0}
                maximum={300}
                onStep={(amount) => setIntervalValue('rest', amount, 0, 300)}
              />
              <TimerStepper
                label="Sets"
                helperText="Repeat the whole block"
                value={activeTimer.sets}
                displayValue={String(activeTimer.sets)}
                step={1}
                minimum={1}
                maximum={10}
                onStep={(amount) => setIntervalValue('sets', amount, 1, 10)}
              />
              {activeTimer.sets > 1 && (
                <TimerStepper
                  label="Rest between sets"
                  helperText="Shown as SET BREAK"
                  value={activeTimer.setRest}
                  displayValue={formatTime(activeTimer.setRest)}
                  step={15}
                  minimum={0}
                  maximum={600}
                  onStep={(amount) => setIntervalValue('setRest', amount, 0, 600)}
                />
              )}
              <TimerStepper
                label="Get ready"
                helperText="Countdown before round 1"
                value={activeTimer.prep}
                displayValue={activeTimer.prep === 0 ? 'Off' : formatTime(activeTimer.prep)}
                step={5}
                minimum={0}
                maximum={30}
                onStep={(amount) => setIntervalValue('prep', amount, 0, 30)}
              />
            </>
          )}
        </div>
      </div>

      <div className="my-2 rounded-lg border border-[#2A2C27] bg-[#141512] px-3 py-2 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8A8D84]">Total time</p>
        <p className="font-display text-[clamp(2rem,10cqw,3rem)] font-black leading-none tabular-nums text-lime">
          {totalTime === undefined ? 'NO CAP' : formatTime(totalTime, true)}
        </p>
        <p className="mt-1 truncate text-[11px] font-semibold text-[#C9CBC4]">{summaryFor(configuration)}</p>
      </div>

      <footer className="board-timer-setup-actions grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <button
          type="button"
          onClick={() => onStart(configuration)}
          className="min-h-[54px] rounded-lg bg-lime px-3 font-display text-[18px] font-black uppercase text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          ▶ Start
        </button>
        <button
          type="button"
          onClick={() => onDone(configuration)}
          className="min-h-[54px] rounded-lg border border-[#3A3C36] px-4 font-display text-[15px] font-extrabold uppercase text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
        >
          Done
        </button>
      </footer>
    </div>
  );
}
