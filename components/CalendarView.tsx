'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { Card } from './ui';
import { getWorkoutTypeStyle } from '@/lib/workout-colors';

interface Workout {
  id: number;
  title: string;
  description: string;
  workout_type: string;
  date: string;
  max_participants: number;
  registered_count: number;
  is_registered: boolean;
  creator_name: string;
}

interface CalendarViewProps {
  workouts: Workout[];
}

type ViewMode = 'calendar' | 'list';

export default function CalendarView({ workouts }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  // Generate calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = 'MMMM yyyy';
  const dayFormat = 'd';

  const rows = [];
  let days = [];
  let day = startDate;

  // Group workouts by date for easy lookup
  const workoutsByDate: { [key: string]: Workout[] } = {};
  workouts.forEach((workout) => {
    const dateKey = format(parseISO(workout.date), 'yyyy-MM-dd');
    if (!workoutsByDate[dateKey]) {
      workoutsByDate[dateKey] = [];
    }
    workoutsByDate[dateKey].push(workout);
  });

  // Generate calendar rows
  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const formattedDate = format(day, dayFormat);
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayWorkouts = workoutsByDate[dateKey] || [];
      const cloneDay = day;

      days.push(
        <div
          key={day.toString()}
          className={`min-h-[80px] sm:min-h-[120px] border border-gray-300 p-1 sm:p-2 ${
            !isSameMonth(day, monthStart)
              ? 'bg-pure-bg/50 text-gray-600'
              : 'bg-pure-surface text-pure-ink'
          } ${isSameDay(day, new Date()) ? 'ring-2 ring-pure-accent-ink' : ''}`}
        >
          <div className="font-semibold mb-1">{formattedDate}</div>
          <div className="space-y-1">
            {dayWorkouts.map((workout) => (
              <Link key={workout.id} href={`/workouts/${workout.id}`}>
                <div
                  className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 transition ${
                    workout.is_registered
                      ? 'bg-pure-green text-black ring-1 ring-pure-accent-ink'
                      : getWorkoutTypeStyle(workout.workout_type).chip
                  }`}
                >
                  <div className="font-semibold truncate">{workout.title}</div>
                  <div className="text-[10px]">
                    {format(parseISO(workout.date), 'h:mm a')}
                  </div>
                  <div className="text-[10px]">
                    {workout.registered_count}/{workout.max_participants}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div key={day.toString()} className="grid grid-cols-7">
        {days}
      </div>
    );
    days = [];
  }

  const nextMonth = () => {
    setCurrentMonth(addDays(monthStart, 32));
  };

  const prevMonth = () => {
    setCurrentMonth(addDays(monthStart, -32));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // List view - group workouts by date
  const groupedWorkouts: { [key: string]: Workout[] } = {};
  workouts
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach((workout) => {
      const dateKey = format(parseISO(workout.date), 'yyyy-MM-dd');
      if (!groupedWorkouts[dateKey]) {
        groupedWorkouts[dateKey] = [];
      }
      groupedWorkouts[dateKey].push(workout);
    });

  return (
    <div>
      {/* View Toggle */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2 border border-gray-300 rounded-lg p-1 bg-pure-surface">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded transition font-medium ${
              viewMode === 'calendar'
                ? 'bg-pure-green text-black'
                : 'text-pure-text-light hover:text-pure-ink'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded transition font-medium ${
              viewMode === 'list'
                ? 'bg-pure-green text-black'
                : 'text-pure-text-light hover:text-pure-ink'
            }`}
          >
            List
          </button>
        </div>

        {viewMode === 'calendar' && (
          <div className="flex flex-wrap gap-2 items-center justify-end">
            <button
              onClick={prevMonth}
              className="px-3 py-2 bg-pure-surface border border-gray-300 rounded-lg hover:bg-coastal-search/20 transition text-pure-ink"
            >
              ←
            </button>
            <h2 className="text-lg font-bold text-pure-ink min-w-[150px] text-center">
              {format(currentMonth, dateFormat)}
            </h2>
            <button
              onClick={nextMonth}
              className="px-3 py-2 bg-pure-surface border border-gray-300 rounded-lg hover:bg-coastal-search/20 transition text-pure-ink"
            >
              →
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-2 bg-coastal-sky text-white rounded-lg hover:bg-coastal-sky/80 transition font-medium"
            >
              Today
            </button>
          </div>
        )}
      </div>

      {viewMode === 'calendar' ? (
        <div className="overflow-x-auto">
          <div className="bg-pure-surface border border-gray-300 rounded-lg overflow-hidden min-w-[560px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-pure-bg border-b border-gray-300">
              {[
                { full: 'Sun', short: 'S' },
                { full: 'Mon', short: 'M' },
                { full: 'Tue', short: 'T' },
                { full: 'Wed', short: 'W' },
                { full: 'Thu', short: 'T' },
                { full: 'Fri', short: 'F' },
                { full: 'Sat', short: 'S' },
              ].map(({ full, short }) => (
                <div
                  key={full}
                  className="p-2 sm:p-3 text-center font-bold text-pure-accent-ink border-r border-gray-300 last:border-r-0 text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">{full}</span>
                  <span className="sm:hidden">{short}</span>
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            {rows}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedWorkouts).length === 0 ? (
            <Card className="bg-pure-surface border-gray-300">
              <p className="text-pure-text-light text-center py-8">No workouts found</p>
            </Card>
          ) : (
            Object.keys(groupedWorkouts).map((dateKey) => (
              <div key={dateKey}>
                <h3 className="text-2xl font-bold text-pure-accent-ink mb-3">
                  {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedWorkouts[dateKey].map((workout) => (
                    <Link key={workout.id} href={`/workouts/${workout.id}`}>
                      <Card className="hover:shadow-xl hover:border-pure-green transition-all cursor-pointer h-full bg-pure-surface border-gray-300">
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded border ${getWorkoutTypeStyle(workout.workout_type).badge}`}>
                            {workout.workout_type}
                          </span>
                          {workout.is_registered && (
                            <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-800 rounded">
                              Registered
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-bold text-pure-ink mb-2">
                          {workout.title}
                        </h3>

                        <p className="text-sm text-pure-text-light mb-4 line-clamp-2">
                          {workout.description || 'No description'}
                        </p>

                        <div className="border-t border-gray-300 pt-3 mt-auto">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-pure-text-light">
                              {format(parseISO(workout.date), 'h:mm a')}
                            </span>
                            <span className="text-pure-text-light">
                              {workout.registered_count}/{workout.max_participants}
                            </span>
                          </div>
                          <div className="text-xs text-pure-text-light mt-2">
                            by {workout.creator_name}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
