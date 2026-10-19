import { addDays, addWeeks, format, startOfDay, startOfMonth, startOfWeek, subWeeks } from 'date-fns';
import type { WorkoutWithDetails } from './types';

export interface AttendanceWeek {
  key: string;
  label: string;
  attended: number;
  registered: number;
  current: boolean;
}

export interface DashboardStats {
  weeks: AttendanceWeek[];
  attended: number;
  registered: number;
  attendanceRate: number;
  streakWeeks: number;
  sessionsThisMonth: number;
  registeredDays: Array<{ key: string; label: string; registered: boolean }>;
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
      current: start.getTime() === currentWeek.getTime(),
    };
  });
  const weeksByKey = new Map(weeks.map((week) => [week.key, week]));
  const streakAttendance = new Map<string, number>();
  let sessionsThisMonth = 0;
  const monthStart = startOfMonth(now);

  for (const workout of workouts) {
    const date = new Date(workout.date);
    if (date < lookupStart || date > now) continue;
    const registration = workout.participants.find((participant) => participant.user_id === userId);
    if (!registration) continue;
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const week = weeksByKey.get(weekKey);
    if (week) {
      week.registered += 1;
      if (registration.attended) week.attended += 1;
    }
    if (registration.attended) {
      streakAttendance.set(weekKey, (streakAttendance.get(weekKey) || 0) + 1);
      if (date >= monthStart) sessionsThisMonth += 1;
    }
  }

  const attended = weeks.reduce((total, week) => total + week.attended, 0);
  const registered = weeks.reduce((total, week) => total + week.registered, 0);
  const attendanceRate = registered ? Math.round((attended / registered) * 100) : 0;
  let streakWeeks = 0;
  let weekStart = currentWeek;
  if (!(streakAttendance.get(format(weekStart, 'yyyy-MM-dd')) || 0)) weekStart = subWeeks(weekStart, 1);
  while (
    weekStart >= lookupStart &&
    (streakAttendance.get(format(weekStart, 'yyyy-MM-dd')) || 0) > 0
  ) {
    streakWeeks += 1;
    weekStart = subWeeks(weekStart, 1);
  }

  const today = startOfDay(now);
  const registeredDates = new Set(
    workouts
      .filter((workout) => workout.is_registered)
      .map((workout) => format(startOfDay(new Date(workout.date)), 'yyyy-MM-dd'))
  );
  const registeredDays = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(today, index);
    const key = format(day, 'yyyy-MM-dd');
    return { key, label: format(day, 'EEEEE'), registered: registeredDates.has(key) };
  });

  return {
    weeks,
    attended,
    registered,
    attendanceRate,
    streakWeeks,
    sessionsThisMonth,
    registeredDays,
  };
}
