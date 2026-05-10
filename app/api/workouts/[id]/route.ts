import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';
import { Registration, Workout } from '@/lib/types';
import { getChronologicalNeighborIds } from '@/lib/day-navigation';
import { notifyWorkoutUpdate, notifyWorkoutCancellation } from '@/lib/email';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const workoutId = parseInt(id);

    const workout = await db.getWorkoutById(workoutId);
    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const creator = await db.getUserById(workout.created_by);
    const registrations = await db.getRegistrationsForWorkout(workoutId);
    const userRegistrations = await db.getRegistrationsForUser(session.id);
    const isRegistered = userRegistrations.some((r: Registration) => r.workout_id === workoutId);

    const participants = await Promise.all(
      registrations.map(async (reg: Registration) => {
        const user = await db.getUserById(reg.user_id);
        return {
          user_id: reg.user_id,
          user_name: user?.name || 'Unknown',
          attended: reg.attended,
        };
      })
    );

    const enrichedWorkout = {
      ...workout,
      creator_name: creator?.name || 'Unknown',
      registered_count: registrations.length,
      is_registered: isRegistered,
      participants,
    };

    // Only include non-deleted workouts in navigation
    const [allForNav, edits] = await Promise.all([
      db.getWorkouts(false),
      db.getWorkoutEdits(workoutId),
    ]);
    const navigation = getChronologicalNeighborIds(
      allForNav.map((w: Workout) => ({ id: w.id, date: w.date })),
      workoutId
    );

    return NextResponse.json({ workout: enrichedWorkout, navigation, edits });
  } catch (error) {
    console.error('Get workout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const workoutId = parseInt(id);

    const body = await request.json();
    const { title, description, workout_type, date, max_participants } = body;

    if (!title || !date) {
      return NextResponse.json({ error: 'Title and date are required' }, { status: 400 });
    }

    const updatedWorkout = await db.updateWorkout(
      workoutId,
      title,
      description || '',
      workout_type || 'General',
      date,
      max_participants || 4,
      session.id
    );

    if (!updatedWorkout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    // Log the edit (fire-and-forget — don't block response)
    db.logWorkoutEdit(workoutId, session.id).catch((e: unknown) => console.error('logWorkoutEdit error:', e));

    // Send update emails to registered users who opted in (fire-and-forget)
    const organizer = await db.getUserById(session.id);
    if (organizer) {
      const registrations = await db.getRegistrationsForWorkout(workoutId);
      const attendees = (
        await Promise.all(
          registrations.map(async (r: Registration) => {
            const u = await db.getUserById(r.user_id);
            if (!u) return null;
            const prefs = await db.getUserNotificationPrefs(r.user_id);
            if (prefs.notify_updates === false) return null;
            return { email: u.email, name: u.name };
          })
        )
      ).filter(Boolean) as { email: string; name: string }[];

      if (attendees.length > 0) {
        notifyWorkoutUpdate(
          { ...updatedWorkout, sequence: updatedWorkout.sequence ?? 0 },
          { email: organizer.email, name: organizer.name },
          attendees
        ).catch((err) => console.error('Update email error:', err));
      }
    }

    return NextResponse.json({ workout: updatedWorkout });
  } catch (error) {
    console.error('Update workout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!session.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const workoutId = parseInt(id);

    // Get data before soft-deleting so we can send cancellation emails
    const workout = await db.getWorkoutById(workoutId);
    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const registrations = await db.getRegistrationsForWorkout(workoutId);
    const organizer = await db.getUserById(session.id);

    const body = await request.json().catch(() => ({}));
    const cancellationReason: string = body.cancellation_reason || '';

    const success = await db.softDeleteWorkout(workoutId, cancellationReason);
    if (!success) {
      return NextResponse.json({ error: 'Workout not found or already cancelled' }, { status: 404 });
    }

    // Send cancellation emails to users who opted in (fire-and-forget)
    if (organizer && registrations.length > 0) {
      const attendees = (
        await Promise.all(
          registrations.map(async (r: Registration) => {
            const u = await db.getUserById(r.user_id);
            if (!u) return null;
            const prefs = await db.getUserNotificationPrefs(r.user_id);
            if (prefs.notify_cancellations === false) return null;
            return { email: u.email, name: u.name };
          })
        )
      ).filter(Boolean) as { email: string; name: string }[];

      if (attendees.length > 0) {
        notifyWorkoutCancellation(
          { ...workout, sequence: (workout.sequence ?? 0) + 1 },
          { email: organizer.email, name: organizer.name },
          attendees
        ).catch((err) => console.error('Cancel email error:', err));
      }
    }

    return NextResponse.json({ message: 'Workout cancelled successfully' });
  } catch (error) {
    console.error('Delete workout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
