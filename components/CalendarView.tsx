'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { Card } from './ui';

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
          className={`min-h-[120px] border border-gray-700 p-2 ${
            !isSameMonth(day, monthStart)
              ? 'bg-pure-dark/50 text-gray-600'
              : 'bg-pure-gray text-pure-white'
          } ${isSameDay(day, new Date()) ? 'ring-2 ring-pure-green' : ''}`}
        >
          <div className="font-semibold mb-1">{formattedDate}</div>
          <div className="space-y-1">
            {dayWorkouts.map((workout) => (
              <Link key={workout.id} href={`/workouts/${workout.id}`}>
                <div
                  className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 transition ${
                    workout.is_registered
                      ? 'bg-pure-green text-black'
                      : 'bg-coastal-sky text-pure-white'
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
        <div className="flex gap-2 border border-gray-700 rounded-lg p-1 bg-pure-gray">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded transition font-medium ${
              viewMode === 'calendar'
                ? 'bg-pure-green text-black'
                : 'text-gray-400 hover:text-pure-white'
            }`}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded transition font-medium ${
              viewMode === 'list'
                ? 'bg-pure-green text-black'
                : 'text-gray-400 hover:text-pure-white'
            }`}
          >
            📋 List
          </button>
        </div>

        {viewMode === 'calendar' && (
          <div className="flex gap-2 items-center">
            <button
              onClick={prevMonth}
              className="px-4 py-2 bg-pure-gray border border-gray-700 rounded-lg hover:bg-coastal-search/20 transition text-pure-white"
            >
              ←
            </button>
            <h2 className="text-xl font-bold text-pure-white min-w-[200px] text-center">
              {format(currentMonth, dateFormat)}
            </h2>
            <button
              onClick={nextMonth}
              className="px-4 py-2 bg-pure-gray border border-gray-700 rounded-lg hover:bg-coastal-search/20 transition text-pure-white"
            >
              →
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-coastal-sky text-pure-white rounded-lg hover:bg-coastal-sky/80 transition font-medium ml-2"
            >
              Today
            </button>
          </div>
        )}
      </div>

      {viewMode === 'calendar' ? (
        <div className="bg-pure-gray border border-gray-700 rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-pure-dark border-b border-gray-700">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="p-3 text-center font-bold text-pure-green border-r border-gray-700 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>
          {/* Calendar grid */}
          {rows}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedWorkouts).length === 0 ? (
            <Card className="bg-pure-gray border-gray-700">
              <p className="text-gray-400 text-center py-8">No workouts found</p>
            </Card>
          ) : (
            Object.keys(groupedWorkouts).map((dateKey) => (
              <div key={dateKey}>
                <h3 className="text-2xl font-bold text-pure-green mb-3">
                  {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedWorkouts[dateKey].map((workout) => (
                    <Link key={workout.id} href={`/workouts/${workout.id}`}>
                      <Card className="hover:shadow-xl hover:border-pure-green transition-all cursor-pointer h-full bg-pure-gray border-gray-700">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-medium px-2 py-1 bg-blue-900 text-blue-200 rounded">
                            {workout.workout_type}
                          </span>
                          {workout.is_registered && (
                            <span className="text-xs font-medium px-2 py-1 bg-green-900 text-green-200 rounded">
                              Registered
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-bold text-pure-white mb-2">
                          {workout.title}
                        </h3>

                        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                          {workout.description || 'No description'}
                        </p>

                        <div className="border-t border-gray-700 pt-3 mt-auto">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400">
                              {format(parseISO(workout.date), 'h:mm a')}
                            </span>
                            <span className="text-gray-400">
                              {workout.registered_count}/{workout.max_participants}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
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
