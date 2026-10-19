import { getWorkoutFormatStamps, getWorkoutScoreboard } from '@/lib/workout-description';

export default function WorkoutFormatStamps({
  title = '',
  description,
  tone = 'light',
  showScoreboard = false,
}: {
  title?: string;
  description: string;
  tone?: 'light' | 'dark';
  showScoreboard?: boolean;
}) {
  const workout = { title, description };
  const stamps = getWorkoutFormatStamps(workout);
  const scoreboard = showScoreboard ? getWorkoutScoreboard(workout) : null;
  if (stamps.length === 0 && !scoreboard) return null;

  const stampClasses = {
    format: tone === 'dark'
      ? 'border-lime bg-lime text-ink'
      : 'border-lime bg-lime text-ink',
    meta: tone === 'dark'
      ? 'border-white text-white'
      : 'border-ink text-ink',
    benchmark: tone === 'dark'
      ? 'border-dashed border-muted bg-transparent text-white'
      : 'border-ink bg-ink text-white',
  };

  return (
    <>
      {stamps.length > 0 && (
        <ul aria-label="Workout format" className="mt-2 flex flex-wrap gap-1.5">
          {stamps.map((stamp) => (
            <li key={`${stamp.variant}-${stamp.label}`} className={`rounded-sm border-[1.5px] px-2 py-0.5 font-display text-[13px] font-extrabold uppercase leading-tight tracking-[.05em] ${stampClasses[stamp.variant]}`}>
              {stamp.label}
            </li>
          ))}
        </ul>
      )}
      {scoreboard && (
        <div className={`mt-3 ${tone === 'dark' ? 'text-white' : 'text-ink'}`}>
          <p className="font-display text-[44px] font-black leading-none tabular-nums">{scoreboard.scheme}</p>
          {scoreboard.movements.length > 0 && (
            <p className={`mt-1 text-[15px] ${tone === 'dark' ? 'text-white' : 'text-ink-2'}`}>
              {scoreboard.movements.join(' · ')}
            </p>
          )}
        </div>
      )}
    </>
  );
}
