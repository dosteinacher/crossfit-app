import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';
import { Registration } from '@/lib/types';

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
    const workoutId = parseInt(id, 10);
    if (Number.isNaN(workoutId)) {
      return NextResponse.json({ error: 'Invalid workout id' }, { status: 400 });
    }

    const workout = await db.getWorkoutById(workoutId);
    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    if (new Date(workout.date) >= new Date()) {
      return NextResponse.json(
        { error: 'Result and rating can only be set for past workouts' },
        { status: 400 }
      );
    }

    const userRegistrations = await db.getRegistrationsForUser(session.id);
    const isParticipant = userRegistrations.some(
      (r: Registration) => r.workout_id === workoutId
    );
    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Only participants can set result and rating' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    let { result, rating } = body;

    if (result !== undefined && typeof result !== 'string') {
      result = result == null ? null : String(result);
    }
    if (rating !== undefined && rating !== null) {
      const r = Number(rating);
      if (Number.isNaN(r) || r < 1 || r > 5) {
        return NextResponse.json(
          { error: 'Rating must be a number between 1 and 5' },
          { status: 400 }
        );
      }
      rating = r;
    }

    const resultVal = result === undefined ? workout.result ?? null : (result?.trim() || null);
    const ratingVal = rating === undefined ? workout.rating ?? null : rating;

    const updated = await db.updateWorkoutResultAndRating(workoutId, resultVal, ratingVal);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    const updatedWorkout = await db.getWorkoutById(workoutId);
    return NextResponse.json({
      message: 'Result and rating updated',
      workout: updatedWorkout,
    });
  } catch (error) {
    console.error('Update workout result/rating error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
