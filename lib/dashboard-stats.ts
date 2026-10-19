import { addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import type { WorkoutWithDetails } from './types';

export interface AttendanceWeek {
  key: string;
  label: string;
  attended: number;
  registered: number;
}

export interface DashboardStats {
  weeks: AttendanceWeek[];
  attended: number;
  registered: number;
  attendanceRate: number;
  streakWeeks: number;
}

export function getDashboardStats(
  workouts: WorkoutWithDetails[],
  userId: number,
  now: Date
): DashboardStats {
  const currentWeek = startOfWeek(now, { weekStartsOn: 1 });
  const lookupStart = subWeeks(currentWeek, 12);
  const stripStart = subWeeks(currentWeek, 11);
  const weeks = Array.from({ length: 12 }, (_, index) => {
    const start = addWeeks(stripStart, index);
    return {
      key: format(start, 'yyyy-MM-dd'),
      label: format(start, 'd MMM'),
      attended: 0,
      registered: 0,
    };
  });
  const weeksByKey = new Map(weeks.map((week) => [week.key, week]));

  for (const workout of workouts) {
    const date = new Date(workout.date);
    if (date < lookupStart || date > now) continue;
    const week = weeksByKey.get(format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    if (!week) continue;
    const registration = workout.participants.find((participant) => participant.user_id === userId);
    if (!registration) continue;
    week.registered += 1;
    if (registration.attended) week.attended += 1;
  }

  const attended = weeks.reduce((total, week) => total + week.attended, 0);
  const registered = weeks.reduce((total, week) => total + week.registered, 0);
  const attendanceRate = registered ? Math.round((attended / registered) * 100) : 0;
  let streakWeeks = 0;
  let weekIndex = weeks.length - 1;
  if (weeks[weekIndex].attended === 0) weekIndex -= 1;
  while (weekIndex >= 0 && weeks[weekIndex].attended > 0) {
    streakWeeks += 1;
    weekIndex -= 1;
  }

  return { weeks, attended, registered, attendanceRate, streakWeeks };
}
