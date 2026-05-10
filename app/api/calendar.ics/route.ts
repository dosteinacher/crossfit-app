import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Registration } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return new NextResponse('Missing token', { status: 401 });
    }

    const user = await db.getUserByCalendarToken(token);
    if (!user) {
      return new NextResponse('Invalid token', { status: 401 });
    }

    const registrations = await db.getRegistrationsForUser(user.id);
    const registeredIds = new Set(registrations.map((r: Registration) => r.workout_id));

    const allWorkouts = await db.getWorkouts(false);
    const myWorkouts = allWorkouts.filter((w: { id: number }) => registeredIds.has(w.id));

    const now = new Date();
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GO PURE//Workout Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:GO PURE – ${user.name}`,
      'X-WR-TIMEZONE:Europe/Zurich',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
      `X-PUBLISHED-TTL:PT1H`,
    ];

    for (const w of myWorkouts) {
      const start = new Date(w.date);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const fmt = (d: Date) =>
        d.toISOString().replace(/[-:]/g, '').replace('.000', '');

      const safeText = (s: string) =>
        (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:workout-${w.id}@gopure`);
      lines.push(`DTSTAMP:${fmt(now)}`);
      lines.push(`DTSTART:${fmt(start)}`);
      lines.push(`DTEND:${fmt(end)}`);
      lines.push(`SUMMARY:${safeText(w.title)}`);
      if (w.description) lines.push(`DESCRIPTION:${safeText(w.workout_type ? `${w.workout_type}\\n\\n${w.description}` : w.description)}`);
      lines.push('LOCATION:GO PURE Gym');
      lines.push(`STATUS:${w.deleted_at ? 'CANCELLED' : 'CONFIRMED'}`);
      lines.push(`SEQUENCE:${w.sequence ?? 0}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    return new NextResponse(lines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="go-pure-workouts.ics"',
        'Cache-Control': 'no-cache, no-store',
      },
    });
  } catch (error) {
    console.error('Calendar ICS error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
