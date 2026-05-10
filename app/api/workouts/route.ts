import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';
import { Workout, Registration, User } from '@/lib/types';
import { notifyWorkoutCreator, notifyWorkoutRegistration } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter');

    // 3 queries instead of O(n*m) — fetch all, assemble in memory
    const [workouts, allUsers, allRegistrations] = await Promise.all([
      db.getWorkouts(filter === 'upcoming'),
      db.getAllUsers(),
      db.getAllRegistrations(),
    ]);

    const usersById = new Map<number, User>(allUsers.map((u: User) => [u.id, u]));
    const regsByWorkout = new Map<number, Registration[]>();
    const currentUserRegSet = new Set<number>();

    for (const reg of allRegistrations) {
      if (reg.user_id === session.id) currentUserRegSet.add(reg.workout_id);
      if (!regsByWorkout.has(reg.workout_id)) regsByWorkout.set(reg.workout_id, []);
      regsByWorkout.get(reg.workout_id)!.push(reg);
    }

    const enrichedWorkouts = workouts.map((workout: Workout) => {
      const regs = regsByWorkout.get(workout.id) || [];
      return {
        ...workout,
        creator_name: usersById.get(workout.created_by)?.name || 'Unknown',
        registered_count: regs.length,
        is_registered: currentUserRegSet.has(workout.id),
        participants: regs.map((r: Registration) => ({
          user_id: r.user_id,
          user_name: usersById.get(r.user_id)?.name || 'Unknown',
          attended: r.attended,
        })),
      };
    });

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
      // Normalize IDs to numbers (request body may have string IDs, causing getUserById to return null)
      const normalizedIds = pre_selected_user_ids
        .map((id: unknown) => Number(id))
        .filter((id: number) => !Number.isNaN(id));

      const creator = await db.getUserById(session.id);
      const creatorIdNum = Number(session.id);

      for (const userIdNum of normalizedIds) {
        try {
          await db.registerForWorkout(workout.id, userIdNum);

          // Send calendar invite (skip if user is the creator - already got creator notification)
          if (userIdNum !== creatorIdNum) {
            const user = await db.getUserById(userIdNum);
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
          }
        } catch (registrationError) {
          console.error(`Failed to register or send invite to user ${userIdNum}:`, registrationError);
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
