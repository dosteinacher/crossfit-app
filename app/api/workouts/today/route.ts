import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get today's date range (start and end of day)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startDate = startOfDay.toISOString();
    const endDate = endOfDay.toISOString();

    // Fetch workouts for today
    const workouts = await db.getWorkoutsByDateRange(startDate, endDate);

    // Enrich workouts with creator info and registration counts
    const enrichedWorkouts = await Promise.all(
      workouts.map(async (workout) => {
        const creator = await db.getUserById(workout.created_by);
        const registrations = await db.getRegistrationsForWorkout(workout.id);

        return {
          ...workout,
          creator_name: creator?.name || 'Unknown',
          registered_count: registrations.length,
        };
      })
    );

    return NextResponse.json({ workouts: enrichedWorkouts });
  } catch (error) {
    console.error('Get today workouts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
