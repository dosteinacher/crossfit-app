// ICS (iCalendar) file generator for workout calendar invites
// RFC 5545 compliant

import { format } from 'date-fns';

export type ICSAction = 'create' | 'update' | 'cancel';

export interface WorkoutData {
  id: number;
  title: string;
  description: string;
  date: string; // ISO format
  workout_type?: string;
  sequence?: number;
}

export interface UserData {
  email: string;
  name: string;
}

/**
 * Format date for ICS format: YYYYMMDDTHHMMSSZ
 */
function formatICSDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Generate a unique UID for the calendar event
 */
function generateUID(workoutId: number): string {
  return `workout-${workoutId}@crossfit-app.com`;
}

/**
 * Escape special characters in ICS content
 */
function escapeICSText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate ICS file content for a workout
 */
export function generateICSFile(
  workout: WorkoutData,
  organizer: UserData,
  attendee: UserData,
  action: ICSAction = 'create'
): string {
  const now = new Date();
  const workoutDate = new Date(workout.date);
  const sequence = workout.sequence || 0;
  
  // Calculate end time (assume 1 hour duration)
  const endDate = new Date(workoutDate.getTime() + 60 * 60 * 1000);
  
  // Determine method and status based on action
  const method = action === 'cancel' ? 'CANCEL' : 'REQUEST';
  const status = action === 'cancel' ? 'CANCELLED' : 'CONFIRMED';
  
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Crossfit App//NONSGML v1.0//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${generateUID(workout.id)}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(workoutDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICSText(workout.title)}`,
  ];
  
  // Add description if available
  if (workout.description) {
    const description = workout.workout_type 
      ? `${workout.workout_type}\\n\\n${workout.description}`
      : workout.description;
    icsLines.push(`DESCRIPTION:${escapeICSText(description)}`);
  }
  
  // Add location
  icsLines.push('LOCATION:Crossfit Gym');
  
  // Add status and sequence
  icsLines.push(`STATUS:${status}`);
  icsLines.push(`SEQUENCE:${sequence}`);
  
  // Add organizer
  icsLines.push(`ORGANIZER;CN=${escapeICSText(organizer.name)}:mailto:${organizer.email}`);
  
  // Add attendee
  icsLines.push(`ATTENDEE;CN=${escapeICSText(attendee.name)};RSVP=TRUE:mailto:${attendee.email}`);
  
  // Close the event and calendar
  icsLines.push('END:VEVENT');
  icsLines.push('END:VCALENDAR');
  
  return icsLines.join('\r\n');
}

/**
 * Generate filename for the ICS file
 */
export function generateICSFilename(workout: WorkoutData): string {
  const dateStr = format(new Date(workout.date), 'yyyy-MM-dd');
  const titleSlug = workout.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `workout-${dateStr}-${titleSlug}.ics`;
}
