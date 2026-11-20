import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';
import { notifyWorkoutRegistration, notifyCoachRegistrationChange, getCoachEmail } from '@/lib/email';
import type { Registration, User, Workout } from '@/lib/types';

/**
 * Email the coach about a sign-up or unregister, with the new head count.
 * Skipped when the coach made the change. Never fails the request.
 */
async function notifyCoach(
  change: 'registered' | 'unregistered',
  workout: Workout,
  participantId: number,
  actorId: number
) {
  try {
    const coachEmail = getCoachEmail()?.toLowerCase();
    const [participant, actor, registrations] = await Promise.all([
      db.getUserById(participantId),
      db.getUserById(actorId),
      db.getRegistrationsForWorkout(workout.id),
    ]);
    if (!participant || !coachEmail) return;
    if (actor?.email.toLowerCase() === coachEmail) return;

    const users = await Promise.all((registrations as Registration[]).map((reg) => db.getUserById(reg.user_id) as Promise<User | null>));
    const participants = users
      .filter((u): u is NonNullable<typeof u> => Boolean(u))
      .map((u) => ({ email: u.email, name: u.name }));

    await notifyCoachRegistrationChange(
      change,
      { id: workout.id, title: workout.title, date: workout.date, max_participants: workout.max_participants },
      { email: participant.email, name: participant.name },
      participants,
      actor ? { email: actor.email, name: actor.name } : undefined
    );
  } catch (emailError) {
    console.error('Failed to notify coach:', emailError);
  }
}

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

    await notifyCoach('registered', workout, targetUserId, session.id);

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

    const workout = await db.getWorkoutById(workoutId);
    if (workout) await notifyCoach('unregistered', workout, targetUserId, session.id);

    return NextResponse.json({ message: 'Unregistered successfully' });
  } catch (error) {
    console.error('Unregister from workout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
