import { getWorkoutFormatStamps } from '@/lib/workout-description';

export default function WorkoutFormatStamps({
  description,
  tone = 'light',
}: {
  description: string;
  tone?: 'light' | 'dark';
}) {
  const stamps = getWorkoutFormatStamps(description);
  if (stamps.length === 0) return null;

  const stampClass = tone === 'dark'
    ? 'border-white/20 bg-white/10 text-white'
    : 'border-line bg-canvas text-ink-2';

  return (
    <ul aria-label="Workout format" className="mt-2 flex flex-wrap gap-1.5">
      {stamps.map((stamp) => (
        <li key={stamp} className={`rounded-sm border px-2 py-1 text-[13px] font-bold uppercase leading-tight ${stampClass}`}>
          {stamp}
        </li>
      ))}
    </ul>
  );
}
