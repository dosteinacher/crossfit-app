import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';
import { Workout } from '@/lib/types';
import { WorkoutTemplate } from '@/lib/workout-templates';
import { format } from 'date-fns';

function formatWorkout(w: Workout): string {
  const dateStr = w.date ? format(new Date(w.date), 'yyyy-MM-dd HH:mm') : 'No date';
  const lines = [
    `Title: ${w.title}`,
    `Date: ${dateStr}`,
    `Type: ${w.workout_type}`,
    `Max participants: ${w.max_participants}`,
    `Description:`,
    (w.description || '(none)').trim(),
    '',
  ];
  return lines.join('\n');
}

function formatTemplate(t: WorkoutTemplate): string {
  const lines = [
    `Title: ${t.title}`,
    `Category: ${t.category}`,
    `Type: ${t.workout_type}`,
    `Used: ${t.times_used}x`,
    `Description:`,
    (t.description || '(none)').trim(),
    '',
  ];
  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const [workouts, templates] = await Promise.all([
      db.getWorkouts(false) as Promise<Workout[]>,
      db.getWorkoutTemplates() as Promise<WorkoutTemplate[]>,
    ]);

    const sections: string[] = [];
    sections.push('========================================');
    sections.push('SCHEDULED WORKOUTS');
    sections.push('========================================');
    sections.push('');
    if (workouts.length === 0) {
      sections.push('(No scheduled workouts)');
      sections.push('');
    } else {
      workouts.forEach((w, i) => {
        sections.push(`--- Workout ${i + 1} ---`);
        sections.push(formatWorkout(w));
      });
    }

    sections.push('========================================');
    sections.push('ARCHIVE (WORKOUT TEMPLATES)');
    sections.push('========================================');
    sections.push('');
    if (templates.length === 0) {
      sections.push('(No templates in archive)');
      sections.push('');
    } else {
      templates.forEach((t, i) => {
        sections.push(`--- Template ${i + 1} ---`);
        sections.push(formatTemplate(t));
      });
    }

    const text = sections.join('\n');
    const filename = `workouts-export-${format(new Date(), 'yyyy-MM-dd')}.txt`;

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export workouts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
