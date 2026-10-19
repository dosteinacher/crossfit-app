'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { CapacityBar, Card, Label, SegmentedControl, StatusAction } from './ui';
import WorkoutFormatStamps from './WorkoutFormatStamps';
import { getWorkoutFormat } from '@/lib/workout-description';

interface Workout {
  id: number;
  title: string;
  description: string;
  workout_type: string;
  date: string;
  max_participants: number;
  registered_count: number;
  is_registered: boolean;
  participants?: Array<{ user_id: number; attended: boolean }>;
  creator_name: string;
}

interface CalendarViewProps {
  workouts: Workout[];
}

type ViewMode = 'month' | 'list';

const VIEW_OPTIONS: Array<{ label: string; value: ViewMode }> = [
  { label: 'Month', value: 'month' },
  { label: 'List', value: 'list' },
];

function statusFor(workout: Workout, now: Date): 'registered' | 'open' | 'full' | 'past' {
  if (new Date(workout.date) < now) return 'past';
  if (workout.is_registered) return 'registered';
  if (workout.registered_count >= workout.max_participants) return 'full';
  return 'open';
}

export default function CalendarView({ workouts }: CalendarViewProps) {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [calendarWorkouts, setCalendarWorkouts] = useState(workouts);
  const [registering, setRegistering] = useState<number | null>(null);

  useEffect(() => {
    setCalendarWorkouts(workouts);
  }, [workouts]);

  useEffect(() => {
    setViewMode(window.matchMedia('(max-width: 767px)').matches ? 'list' : 'month');
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const sortedWorkouts = [...calendarWorkouts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const now = new Date();
  const todayStart = startOfDay(now);
  const workoutsByDate: Record<string, Workout[]> = {};
  for (const workout of sortedWorkouts) {
    const key = format(parseISO(workout.date), 'yyyy-MM-dd');
    (workoutsByDate[key] ||= []).push(workout);
  }

  const groupedWorkouts = new Map<string, Workout[]>();
  for (const workout of sortedWorkouts) {
    const weekKey = format(startOfWeek(parseISO(workout.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const group = groupedWorkouts.get(weekKey) || [];
    group.push(workout);
    groupedWorkouts.set(weekKey, group);
  }

  const handleRegistration = async (workout: Workout) => {
    const isRegistered = workout.is_registered;
    setRegistering(workout.id);
    try {
      const response = await fetch(`/api/workouts/${workout.id}/register`, {
        method: isRegistered ? 'DELETE' : 'POST',
      });
      if (!response.ok) throw new Error('Could not update workout registration');
      setCalendarWorkouts((current) => current.map((item) => (
        item.id === workout.id
          ? {
              ...item,
              is_registered: !isRegistered,
              registered_count: Math.max(0, item.registered_count + (isRegistered ? -1 : 1)),
            }
          : item
      )));
    } catch (error) {
      console.error('Workout registration error:', error);
    } finally {
      setRegistering(null);
    }
  };

  const renderAgendaRow = (workout: Workout) => {
    const date = parseISO(workout.date);
    const status = statusFor(workout, now);
    const full = status === 'full';
    const pending = registering === workout.id;
    return (
      <div key={workout.id} className="grid grid-cols-[40px_minmax(0,1fr)_20px] items-center gap-3 px-3 py-4 first:rounded-t-lg last:rounded-b-lg md:grid-cols-[56px_68px_minmax(0,1fr)_auto_auto] md:gap-4 md:px-5">
        <div className="flex flex-col items-center">
          <span className="text-[13px] font-bold uppercase text-ink-2">{format(date, 'EEE')}</span>
          <span className="mt-0.5 font-display text-[34px] font-black leading-none tracking-[-.01em] tabular-nums text-ink">{format(date, 'd')}</span>
        </div>
        <time className="hidden whitespace-nowrap text-sm font-bold tabular-nums text-ink md:block">{format(date, 'HH:mm')}</time>
        <Link href={`/workouts/${workout.id}`} className="min-w-0 group">
          <span className="block truncate font-semibold text-ink group-hover:underline">{workout.title}</span>
          <WorkoutFormatStamps title={workout.title} description={workout.description || ''} />
          <span className="mt-1 block text-[13px] text-ink-2 md:hidden">
            {format(date, 'HH:mm')}
          </span>
        </Link>
        <CapacityBar value={workout.registered_count} max={workout.max_participants} className="hidden md:inline-flex" />
        {status === 'past' ? (
          <span className="hidden min-h-11 items-center px-3 text-sm font-semibold text-ink-2 md:inline-flex">Past</span>
        ) : (
          <StatusAction
            status={status}
            disabled={pending || (full && !workout.is_registered)}
            onJoin={() => void handleRegistration(workout)}
            onUnregister={() => void handleRegistration(workout)}
            className="hidden md:inline-flex"
          />
        )}
        <span
          aria-label={status === 'registered' ? 'Registered' : status === 'full' ? 'Full' : status === 'past' ? 'Past workout' : 'Spots open'}
          className={`h-3.5 w-3.5 rounded-full border md:hidden ${
            status === 'registered'
              ? 'border-lime bg-lime'
              : status === 'full' || status === 'past'
                ? 'border-line bg-line'
                : 'border-ink bg-white'
          }`}
        />
      </div>
    );
  };

  return (
    <div>
      <header className="mb-5 flex flex-col gap-4 md:mb-6 md:flex-row md:items-center md:justify-between">
        <h1 className="font-display text-[58px] font-black uppercase leading-[.82] tracking-[-.01em] text-ink md:text-[96px]">
          {format(currentMonth, 'MMMM yyyy')}
        </h1>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} aria-label="Previous month" className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-line bg-paper text-xl text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15">←</button>
          <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} aria-label="Next month" className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-line bg-paper text-xl text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15">→</button>
          <button type="button" onClick={() => setCurrentMonth(new Date())} className="inline-flex min-h-10 items-center rounded-sm border border-line bg-paper px-3 text-sm font-bold text-ink hover:bg-canvas">Today</button>
          <SegmentedControl items={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} ariaLabel="Calendar view" />
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Calendar legend">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-ink-2"><span className="h-3 w-3 rounded-sm bg-lime" />You&apos;re in</span>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-ink-2"><span className="h-3 w-3 rounded-sm border border-ink bg-white" />Spots open</span>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-ink-2"><span className="h-3 w-3 rounded-sm bg-line" />Full</span>
      </div>

      {viewMode === 'month' ? (
        <div className="overflow-hidden rounded-xl bg-line">
          <div className="grid grid-cols-7 gap-px">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
              <div key={day} className="bg-paper px-2 py-3 text-center text-[13px] font-bold uppercase tracking-wide text-ink-2">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.slice(0, 1)}</span>
              </div>
            ))}
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayWorkouts = workoutsByDate[dateKey] || [];
              const isToday = isSameDay(day, now);
              const pastDay = day < todayStart;
              return (
                <div key={dateKey} className={`min-h-[118px] overflow-hidden p-2 sm:p-[10px] ${pastDay || !isSameMonth(day, monthStart) ? 'bg-[#FAFAF7]' : 'bg-paper'}`}>
                  <div className="mb-2 flex justify-start">
                    <span className={`inline-flex h-[30px] min-w-[30px] items-center justify-center rounded-full px-1 text-sm font-bold tabular-nums ${isToday ? 'bg-ink text-white' : isSameMonth(day, monthStart) ? 'text-ink' : 'text-ink-2'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {dayWorkouts.map((workout) => {
                      const status = statusFor(workout, now);
                      const workoutFormat = getWorkoutFormat(workout).format;
                      const isAttended = Boolean(user?.id && workout.participants?.some(
                        (participant) => participant.user_id === user.id && participant.attended
                      ));
                      const chipClass = status === 'past'
                        ? 'bg-canvas text-ink-2'
                        : status === 'registered'
                        ? 'bg-lime text-ink'
                        : status === 'open'
                          ? 'border-[1.5px] border-ink bg-white text-ink'
                          : status === 'full'
                            ? 'bg-line text-ink-2'
                            : 'bg-canvas text-ink-2';
                      return (
                        <Link key={workout.id} href={`/workouts/${workout.id}`} className={`block overflow-hidden rounded-[7px] px-[7px] py-[5px] text-[13px] leading-tight ${chipClass}`}>
                            <span className="block truncate font-bold tabular-nums">
                              {status === 'past' && isAttended
                                ? '✓ Attended'
                                : `${format(parseISO(workout.date), 'HH:mm')}${workoutFormat ? ` · ${workoutFormat}` : ''}`}
                            </span>
                          <span className="mt-0.5 block truncate">{workout.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : groupedWorkouts.size === 0 ? (
        <Card>
          <p className="py-4 text-base text-ink-2">No workouts found.</p>
        </Card>
      ) : (
        <div className="space-y-5">
          {[...groupedWorkouts.entries()].map(([weekKey, weekWorkouts]) => (
            <section key={weekKey}>
              <div className="mb-2"><Label>Week of {format(parseISO(weekKey), 'd MMM')}</Label></div>
              <Card className="!p-0 divide-y divide-line-2">
                {weekWorkouts.map(renderAgendaRow)}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
