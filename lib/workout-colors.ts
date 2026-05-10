export type WorkoutTypeStyle = {
  badge: string;
  calendarDot: string;
  leftBorder: string;
};

const STYLES: Record<string, WorkoutTypeStyle> = {
  'Strength':        { badge: 'bg-coastal-honey/20 text-coastal-honey border border-coastal-honey/50',    calendarDot: 'bg-coastal-honey',  leftBorder: 'border-l-coastal-honey' },
  'Cardio':          { badge: 'bg-coastal-sky/20 text-coastal-sky border border-coastal-sky/50',          calendarDot: 'bg-coastal-sky',    leftBorder: 'border-l-coastal-sky' },
  'HIIT':            { badge: 'bg-red-900/40 text-red-300 border border-red-700/50',                      calendarDot: 'bg-red-500',        leftBorder: 'border-l-red-500' },
  'Mobility':        { badge: 'bg-pure-green/20 text-pure-green border border-pure-green/50',             calendarDot: 'bg-pure-green',     leftBorder: 'border-l-pure-green' },
  'Olympic Lifting': { badge: 'bg-coastal-day/20 text-coastal-day border border-coastal-day/50',          calendarDot: 'bg-coastal-day',    leftBorder: 'border-l-coastal-day' },
  'Gymnastics':      { badge: 'bg-purple-900/40 text-purple-300 border border-purple-700/50',             calendarDot: 'bg-purple-500',     leftBorder: 'border-l-purple-500' },
  'General':         { badge: 'bg-gray-700/60 text-gray-300 border border-gray-600',                      calendarDot: 'bg-gray-500',       leftBorder: 'border-l-gray-500' },
};

const DEFAULT: WorkoutTypeStyle = {
  badge: 'bg-gray-700/60 text-gray-300 border border-gray-600',
  calendarDot: 'bg-gray-500',
  leftBorder: 'border-l-gray-500',
};

export function getWorkoutTypeStyle(type: string): WorkoutTypeStyle {
  return STYLES[type] ?? DEFAULT;
}
