'use client';

import { useMemo } from 'react';
import WorkoutPartContent from '@/components/WorkoutPartContent';
import { parseWorkout } from '@/lib/workoutNotation';
import { getDefaultBoardTimerConfiguration } from '@/lib/boardTimer';

function timerStripLabel(configuration: ReturnType<typeof getDefaultBoardTimerConfiguration>) {
  switch (configuration.mode) {
    case 'countup':
      return configuration.minutes ? `COUNT UP · CAP ${configuration.minutes}′` : 'COUNT UP';
    case 'countdown':
      return `COUNTDOWN · CAP ${configuration.minutes}′`;
    case 'emom':
      return `EMOM · EVERY ${configuration.everyMinutes}′ · ${configuration.minutes}′`;
    case 'intervals':
      return configuration.timer
        ? `INTERVALS · ${configuration.timer.rounds} x ${configuration.timer.work}/${configuration.timer.rest}`
        : 'INTERVALS';
  }
}

export default function GuidedLivePreview({
  title,
  description,
  activeIndex,
  onSelectPart,
}: {
  title: string;
  description: string;
  activeIndex: number;
  onSelectPart: (index: number) => void;
}) {
  const { parts } = useMemo(() => parseWorkout(description), [description]);
  const part = parts[activeIndex] || parts[0];
  const configuration = part ? getDefaultBoardTimerConfiguration(part) : undefined;

  const stamps: string[] = [];
  if (part?.format) {
    stamps.push(
      part.minutes && part.format !== 'FOR TIME' ? `${part.format} ${part.minutes}′` : part.format
    );
  }
  if (part?.team) stamps.push(part.team.toUpperCase());
  for (const meta of part?.meta || []) {
    if (!/^team/i.test(meta)) stamps.push(meta.toUpperCase());
  }

  return (
    <div className="sticky top-4">
      <p className="mb-2 text-sm font-bold uppercase tracking-[.1em] text-ink-2">Live preview · what the TV shows</p>
      <div className="overflow-hidden rounded-sm border-[3px] border-ink bg-white">
        {parts.length > 1 && (
          <div className="flex overflow-x-auto" role="tablist" aria-label="Preview part">
            {parts.map((p, index) => (
              <button
                key={`${p.title}-${index}`}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                onClick={() => onSelectPart(index)}
                className={`min-h-9 shrink-0 whitespace-nowrap px-3 text-[12px] font-bold uppercase tracking-wide ${
                  index === activeIndex ? 'bg-lime text-ink' : 'bg-ink text-white/70'
                }`}
              >
                {String(index + 1).padStart(2, '0')} {p.title}
              </button>
            ))}
          </div>
        )}
        <div className="max-h-[32rem] overflow-y-auto p-5">
          {!part ? (
            <p className="py-8 text-center text-sm text-ink-2">Add a part to see it here.</p>
          ) : (
            <>
              {stamps.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {stamps.map((stamp, index) => (
                    <span
                      key={`${stamp}-${index}`}
                      className={`inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                        index === 0 ? 'bg-lime text-ink' : 'border border-line bg-paper text-ink'
                      }`}
                    >
                      {stamp}
                    </span>
                  ))}
                </div>
              )}
              <p className="mb-3 truncate font-display text-2xl font-black uppercase text-ink">{title.trim() || 'Workout title'}</p>
              <WorkoutPartContent title={part.title} minutes={part.minutes} blocks={part.blocks} compact />
            </>
          )}
        </div>
        {configuration && (
          <div className="bg-ink px-4 py-2 text-[12px] font-bold uppercase tracking-[.1em] text-lime">
            ⏱ {timerStripLabel(configuration)}
          </div>
        )}
      </div>
      <p className="mt-2 text-[13px] text-ink-2">Empty fields are left out. Nothing can break the board.</p>
    </div>
  );
}
