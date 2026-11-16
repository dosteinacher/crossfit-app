'use client';

import { useEffect, useRef, useState } from 'react';
import { buildTimeline } from '@/lib/intervalTimer';
import { serializeTimer, type IntervalTimer } from '@/lib/workoutNotation';

const DEFAULT_TIMER: IntervalTimer = {
  rounds: 10,
  work: 40,
  rest: 20,
  sets: 1,
  setRest: 60,
  prep: 10,
};

const PRESETS: Array<{ label: string; timer: IntervalTimer }> = [
  { label: 'HIIT 40/20', timer: DEFAULT_TIMER },
  { label: 'HIIT 30/30', timer: { ...DEFAULT_TIMER, work: 30, rest: 30 } },
  { label: 'Tabata', timer: { ...DEFAULT_TIMER, rounds: 8, work: 20, rest: 10 } },
  { label: 'EMOM 12', timer: { ...DEFAULT_TIMER, rounds: 12, work: 60, rest: 0 } },
];

function formatTime(seconds: number, padMinutes = false) {
  const minutes = Math.floor(seconds / 60);
  return `${padMinutes ? String(minutes).padStart(2, '0') : minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function matchesTimer(left: IntervalTimer, right: IntervalTimer) {
  return left.rounds === right.rounds &&
    left.work === right.work &&
    left.rest === right.rest &&
    left.sets === right.sets &&
    left.setRest === right.setRest &&
    left.prep === right.prep;
}

function TimerStepper({
  label,
  value,
  displayValue,
  step,
  minimum,
  maximum,
  onStep,
}: {
  label: string;
  value: number;
  displayValue: string;
  step: number;
  minimum: number;
  maximum: number;
  onStep: (amount: number) => void;
}) {
  const repeatDelayRef = useRef<number | null>(null);
  const repeatIntervalRef = useRef<number | null>(null);
  const pointerClickRef = useRef(false);

  const stopRepeating = () => {
    if (repeatDelayRef.current !== null) window.clearTimeout(repeatDelayRef.current);
    if (repeatIntervalRef.current !== null) window.clearInterval(repeatIntervalRef.current);
    repeatDelayRef.current = null;
    repeatIntervalRef.current = null;
  };

  useEffect(() => stopRepeating, []);
  useEffect(() => {
    if (value <= minimum || value >= maximum) {
      stopRepeating();
      pointerClickRef.current = false;
    }
  }, [maximum, minimum, value]);

  const startRepeating = (amount: number) => {
    repeatDelayRef.current = window.setTimeout(() => {
      pointerClickRef.current = true;
      onStep(amount);
      repeatIntervalRef.current = window.setInterval(() => onStep(amount), 100);
    }, 400);
  };

  const button = (direction: -1 | 1) => {
    const amount = direction * step;
    const disabled = direction < 0 ? value <= minimum : value >= maximum;
    const action = direction < 0 ? 'Decrease' : 'Increase';
    return (
      <button
        key={direction}
        type="button"
        aria-label={`${action} ${label.toLowerCase()}`}
        disabled={disabled}
        onPointerDown={() => {
          if (!disabled) startRepeating(amount);
        }}
        onPointerUp={stopRepeating}
        onPointerLeave={() => {
          stopRepeating();
          pointerClickRef.current = false;
        }}
        onPointerCancel={() => {
          stopRepeating();
          pointerClickRef.current = false;
        }}
        onClick={() => {
          if (pointerClickRef.current) {
            pointerClickRef.current = false;
            return;
          }
          onStep(amount);
        }}
        className={`h-[52px] w-[52px] shrink-0 rounded-xl bg-[#1E1F1B] text-[28px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime disabled:cursor-not-allowed disabled:opacity-35`}
      >
        {direction < 0 ? '−' : '+'}
      </button>
    );
  };

  return (
    <div className="flex min-h-[76px] items-center justify-between gap-4 border-b border-[#2A2C27] py-2">
      <div className="min-w-0">
        <p className="text-[20px] font-bold text-white">{label}</p>
        <p className="text-[14px] leading-tight text-[#8A8D84]">
          {label === 'Rounds' && 'Work + rest = one round'}
          {label === 'Work' && 'Seconds per work interval'}
          {label === 'Rest' && 'Between rounds · none after the last'}
          {label === 'Sets' && 'Repeat the whole block'}
          {label === 'Rest between sets' && 'Shown as SET BREAK'}
          {label === 'Get ready' && 'Countdown before round 1'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {button(-1)}
        <span className="min-w-[72px] text-center font-display text-[32px] font-extrabold leading-none tabular-nums text-white">
          {displayValue}
        </span>
        {button(1)}
      </div>
    </div>
  );
}

export default function IntervalTimerSetup({
  partIndex,
  partTitle,
  hasTimerLine,
  timer: initialTimer,
  onClose,
  onSave,
  onRemove,
}: {
  partIndex: number;
  partTitle: string;
  hasTimerLine: boolean;
  timer?: IntervalTimer;
  onClose: () => void;
  onSave: (line: string) => void;
  onRemove: () => void;
}) {
  const [timer, setTimer] = useState<IntervalTimer>(() => ({ ...(initialTimer || DEFAULT_TIMER) }));
  const totalTime = Math.max(0, buildTimeline(timer).end - timer.prep);
  const setTimerValue = (key: keyof IntervalTimer, amount: number, minimum: number, maximum: number) => {
    setTimer((current) => ({
      ...current,
      [key]: Math.max(minimum, Math.min(maximum, current[key] + amount)),
    }));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close interval timer setup"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
      />
      <section
        role="dialog"
        aria-labelledby="interval-timer-title"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[18px] bg-ink px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-6 text-white shadow-2xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:mt-3 md:max-h-[min(90vh,920px)] md:w-[560px] md:rounded-xl md:px-8 md:pb-7 md:pt-7"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 truncate text-[13px] font-bold uppercase tracking-[.14em] text-[#8A8D84]">
              PART {String(partIndex + 1).padStart(2, '0')} · {partTitle}
            </p>
            <h2 id="interval-timer-title" className="font-display text-[48px] font-black uppercase leading-[.9] text-white">
              Interval timer
            </h2>
          </div>
          <span className="mt-1 shrink-0 rounded-full border border-[#3A3C36] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#C9CBC4]">
            Board + TV
          </span>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const selected = matchesTimer(timer, preset.timer);
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={selected}
                onClick={() => setTimer({ ...preset.timer })}
                className={`min-h-10 rounded-full border px-4 font-display text-[20px] font-extrabold leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime ${
                  selected
                    ? 'border-lime bg-lime text-ink'
                    : 'border-[#3A3C36] bg-transparent text-white hover:border-[#8A8D84]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="mb-5 rounded-[14px] border border-[#2A2C27] bg-[#141512] px-5 py-4 text-center">
          <div className="mb-1 flex justify-between text-[12px] font-bold uppercase tracking-[.16em] text-[#8A8D84]">
            <span>Total time</span>
            <span>Min : sec</span>
          </div>
          <p className="font-display text-[84px] font-black leading-[.9] tabular-nums text-lime md:text-[120px]">
            {formatTime(totalTime, true)}
          </p>
          <p className="mt-1 text-[16px] font-semibold text-[#C9CBC4]">
            {timer.rounds} rounds · {formatTime(timer.work)} work / {formatTime(timer.rest)} rest
            {timer.sets > 1 ? ` · ${timer.sets} sets` : ''}
          </p>
        </div>

        <div className="border-t border-[#2A2C27]">
          <TimerStepper
            label="Rounds"
            value={timer.rounds}
            displayValue={String(timer.rounds)}
            step={1}
            minimum={1}
            maximum={50}
            onStep={(amount) => setTimerValue('rounds', amount, 1, 50)}
          />
          <TimerStepper
            label="Work"
            value={timer.work}
            displayValue={formatTime(timer.work)}
            step={5}
            minimum={5}
            maximum={600}
            onStep={(amount) => setTimerValue('work', amount, 5, 600)}
          />
          <TimerStepper
            label="Rest"
            value={timer.rest}
            displayValue={formatTime(timer.rest)}
            step={5}
            minimum={0}
            maximum={300}
            onStep={(amount) => setTimerValue('rest', amount, 0, 300)}
          />
          <TimerStepper
            label="Sets"
            value={timer.sets}
            displayValue={String(timer.sets)}
            step={1}
            minimum={1}
            maximum={10}
            onStep={(amount) => setTimerValue('sets', amount, 1, 10)}
          />
          {timer.sets > 1 && (
            <TimerStepper
              label="Rest between sets"
              value={timer.setRest}
              displayValue={formatTime(timer.setRest)}
              step={15}
              minimum={0}
              maximum={600}
              onStep={(amount) => setTimerValue('setRest', amount, 0, 600)}
            />
          )}
          <TimerStepper
            label="Get ready"
            value={timer.prep}
            displayValue={timer.prep === 0 ? 'Off' : formatTime(timer.prep)}
            step={5}
            minimum={0}
            maximum={30}
            onStep={(amount) => setTimerValue('prep', amount, 0, 30)}
          />
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => onSave(serializeTimer(timer))}
            className="min-h-[54px] w-full rounded-xl border border-[#3A3C36] px-3 text-[13px] font-bold text-white hover:bg-[#1E1F1B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          >
            Save to part
          </button>
        </div>
        {hasTimerLine && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={onRemove}
              className="px-3 py-1 text-[12px] font-semibold text-[#8A8D84] underline decoration-[#8A8D84]/50 underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            >
              Remove timer
            </button>
          </div>
        )}
      </section>
    </>
  );
}
