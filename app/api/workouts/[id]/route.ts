export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';

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
    const isRegistered = userRegistrations.some((r) => r.workout_id === workoutId);

    const participants = await Promise.all(
      registrations.map(async (reg) => {
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

    return NextResponse.json({ workout: enrichedWorkout });
  } catch (error) {
    console.error('Get workout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    // Validate input
    if (!title || !date) {
      return NextResponse.json(
        { error: 'Title and date are required' },
        { status: 400 }
      );
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

    return NextResponse.json({ workout: updatedWorkout });
  } catch (error) {
    console.error('Update workout error:', error);
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

    // Only admins can delete workouts
    if (!session.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const workoutId = parseInt(id);

    const success = await db.deleteWorkout(workoutId);
    if (!success) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    console.error('Delete workout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
