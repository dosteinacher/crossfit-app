import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Workout, User } from '@/lib/types';

// Public endpoint: powers the /allwods page. No session required.
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search')?.trim().toLowerCase() || '';

    const [workouts, allUsers, allRegistrations] = await Promise.all([
      db.getWorkouts(false), // already ordered latest-first
      db.getAllUsers(),
      db.getAllRegistrations(),
    ]);

    const usersById = new Map<number, User>(allUsers.map((u: User) => [u.id, u]));
    const regCountByWorkout = new Map<number, number>();
    for (const reg of allRegistrations) {
      regCountByWorkout.set(reg.workout_id, (regCountByWorkout.get(reg.workout_id) || 0) + 1);
    }

    const filtered = search
      ? workouts.filter((w: Workout) =>
          w.title.toLowerCase().includes(search) ||
          w.description?.toLowerCase().includes(search) ||
          w.workout_type?.toLowerCase().includes(search)
        )
      : workouts;

    const enrichedWorkouts = filtered.map((workout: Workout) => ({
      ...workout,
      creator_name: usersById.get(workout.created_by)?.name || 'Unknown',
      registered_count: regCountByWorkout.get(workout.id) || 0,
    }));

    return NextResponse.json({ workouts: enrichedWorkouts });
  } catch (error) {
    console.error('Get all workouts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
