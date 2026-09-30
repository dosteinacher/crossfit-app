export type WorkoutTypeStyle = {
  badge: string;
  calendarDot: string;
  /** Solid calendar chip: background *and* a foreground that stays readable on it.
    Lime is reserved for "you are registered", so no workout type may use it. */
  chip: string;
  leftBorder: string;
};

const STYLES: Record<string, WorkoutTypeStyle> = {
  'Strength':        { badge: 'bg-coastal-honey/20 text-coastal-honey border border-coastal-honey/50',    calendarDot: 'bg-coastal-honey', chip: 'bg-coastal-honey text-white',  leftBorder: 'border-l-coastal-honey' },
  'Cardio':          { badge: 'bg-coastal-sky/20 text-coastal-sky border border-coastal-sky/50',          calendarDot: 'bg-coastal-sky', chip: 'bg-coastal-sky text-white',    leftBorder: 'border-l-coastal-sky' },
  'HIIT':            { badge: 'bg-red-100 text-red-700 border border-red-300',                      calendarDot: 'bg-red-500', chip: 'bg-red-600 text-white',        leftBorder: 'border-l-red-500' },
  'Mobility':        { badge: 'bg-teal-100 text-teal-800 border border-teal-300',                   calendarDot: 'bg-teal-600', chip: 'bg-teal-700 text-white',       leftBorder: 'border-l-teal-600' },
  'Olympic Lifting': { badge: 'bg-coastal-day/20 text-coastal-day border border-coastal-day/50',          calendarDot: 'bg-coastal-day', chip: 'bg-coastal-day text-white',    leftBorder: 'border-l-coastal-day' },
  'Gymnastics':      { badge: 'bg-purple-100 text-purple-700 border border-purple-300',             calendarDot: 'bg-purple-500', chip: 'bg-purple-600 text-white',     leftBorder: 'border-l-purple-500' },
  'General':         { badge: 'bg-gray-100 text-gray-700 border border-gray-400',                      calendarDot: 'bg-gray-500', chip: 'bg-gray-500 text-white',       leftBorder: 'border-l-gray-500' },
};

const DEFAULT: WorkoutTypeStyle = {
  badge: 'bg-gray-100 text-gray-700 border border-gray-400',
  calendarDot: 'bg-gray-500',
  chip: 'bg-gray-500 text-white',
  leftBorder: 'border-l-gray-500',
};

export function getWorkoutTypeStyle(type: string): WorkoutTypeStyle {
  return STYLES[type] ?? DEFAULT;
}
