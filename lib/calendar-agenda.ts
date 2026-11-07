import { startOfDay } from 'date-fns';

export function getCalendarAgendaWorkouts<T extends { date: string }>(
  workouts: readonly T[],
  now: Date,
  isMobile: boolean
): T[] {
  const sortedWorkouts = [...workouts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (isMobile) {
    const todayStart = startOfDay(now);
    return sortedWorkouts.filter((workout) => new Date(workout.date) >= todayStart);
  }

  return sortedWorkouts.reverse();
}
