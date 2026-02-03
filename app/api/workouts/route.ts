import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';
import { Workout, Registration } from '@/lib/types';
import { notifyWorkoutCreator, notifyWorkoutRegistration } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter');

    const workouts = await db.getWorkouts(filter === 'upcoming');

    // Get registrations for current user
    const userRegistrations = await db.getRegistrationsForUser(session.id);
    const registeredWorkoutIds = new Set(userRegistrations.map((r: Registration) => r.workout_id));

    // Enrich workouts with additional data
    const enrichedWorkouts = await Promise.all(
      workouts.map(async (workout: Workout) => {
        const creator = await db.getUserById(workout.created_by);
        const registrations = await db.getRegistrationsForWorkout(workout.id);
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

        return {
          ...workout,
          creator_name: creator?.name || 'Unknown',
          registered_count: registrations.length,
          is_registered: registeredWorkoutIds.has(workout.id),
          participants,
        };
      })
    );

    return NextResponse.json({ workouts: enrichedWorkouts });
  } catch (error) {
    console.error('Get workouts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, workout_type, date, max_participants, pre_selected_user_ids } = body;

    // Validate input
    if (!title || !date) {
      return NextResponse.json(
        { error: 'Title and date are required' },
        { status: 400 }
      );
    }

    const workout = await db.createWorkout(
      title,
      description || '',
      workout_type || 'General',
      date,
      max_participants || 4,
      session.id
    );

    // Send calendar invite to creator
    try {
      const creator = await db.getUserById(session.id);
      if (creator) {
        await notifyWorkoutCreator(
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
          }
        );
      }
    } catch (emailError) {
      // Log email error but don't fail the workout creation
      console.error('Failed to send calendar invite:', emailError);
    }

    // Auto-register pre-selected users and send them calendar invites
    if (pre_selected_user_ids && Array.isArray(pre_selected_user_ids) && pre_selected_user_ids.length > 0) {
      // Get creator info for email notifications
      const creator = await db.getUserById(session.id);
      
      for (const userId of pre_selected_user_ids) {
        try {
          // Skip if user is the creator (already notified above)
          if (userId === session.id) continue;

          // Register the user
          await db.registerForWorkout(workout.id, userId);

          // Send calendar invite
          const user = await db.getUserById(userId);
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
        } catch (registrationError) {
          // Log error but continue with other registrations
          console.error(`Failed to register user ${userId}:`, registrationError);
        }
      }
    }

    return NextResponse.json({ workout }, { status: 201 });
  } catch (error) {
    console.error('Create workout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
