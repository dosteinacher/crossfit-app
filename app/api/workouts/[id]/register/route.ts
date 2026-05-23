import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';
import { notifyWorkoutRegistration } from '@/lib/email';

export async function POST(
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

    // Check if workout exists
    const workout = await db.getWorkoutById(workoutId);
    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    // Check if already at max capacity
    const registrations = await db.getRegistrationsForWorkout(workoutId);
    if (registrations.length >= workout.max_participants) {
      return NextResponse.json(
        { error: 'Workout is at maximum capacity' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const targetUserId = session.is_admin && body.user_id ? body.user_id : session.id;

    const registration = await db.registerForWorkout(workoutId, targetUserId);

    // Send calendar invite to registrant
    try {
      const [user, creator] = await Promise.all([
        db.getUserById(targetUserId),
        db.getUserById(workout.created_by),
      ]);

      if (user && creator) {
        await notifyWorkoutRegistration(
          {
            id: workout.id,
            title: workout.title,
            description: workout.description,
            date: workout.date,
            workout_type: workout.workout_type,
            sequence: workout.sequence,
          },
          {
            email: creator.email,
            name: creator.name,
          },
          {
            email: user.email,
            name: user.name,
          }
        );
      }
    } catch (emailError) {
      // Log email error but don't fail the registration
      console.error('Failed to send calendar invite:', emailError);
    }

    return NextResponse.json({ registration }, { status: 201 });
  } catch (error) {
    console.error('Register for workout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    const { id } = await params;
    const workoutId = parseInt(id);

    const body = await request.json().catch(() => ({}));
    const targetUserId = session.is_admin && body.user_id ? body.user_id : session.id;

    const success = await db.unregisterFromWorkout(workoutId, targetUserId);
    if (!success) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Unregistered successfully' });
  } catch (error) {
    console.error('Unregister from workout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
