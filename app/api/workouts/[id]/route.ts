import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';
import { Registration } from '@/lib/types';
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

    // Send update emails to all registered participants
    try {
      const [creator, registrations] = await Promise.all([
        db.getUserById(updatedWorkout.created_by),
        db.getRegistrationsForWorkout(workoutId),
      ]);

      if (creator && registrations.length > 0) {
        const attendees = await Promise.all(
          registrations.map(async (reg: Registration) => {
            const user = await db.getUserById(reg.user_id);
            return user ? { email: user.email, name: user.name } : null;
          })
        );

        const validAttendees = attendees.filter((a): a is { email: string; name: string } => a !== null);

        if (validAttendees.length > 0) {
          await notifyWorkoutUpdate(
            {
              id: updatedWorkout.id,
              title: updatedWorkout.title,
              description: updatedWorkout.description,
              date: updatedWorkout.date,
              workout_type: updatedWorkout.workout_type,
              sequence: updatedWorkout.sequence,
            },
            {
              email: creator.email,
              name: creator.name,
            },
            validAttendees
          );
        }
      }
    } catch (emailError) {
      // Log email error but don't fail the update
      console.error('Failed to send update emails:', emailError);
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

    // Get workout and registrations before deletion for email notifications
    const workout = await db.getWorkoutById(workoutId);
    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const [creator, registrations] = await Promise.all([
      db.getUserById(workout.created_by),
      db.getRegistrationsForWorkout(workoutId),
    ]);

    const success = await db.deleteWorkout(workoutId);
    if (!success) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    // Send cancellation emails to all registered participants
    try {
      if (creator && registrations.length > 0) {
        const attendees = await Promise.all(
          registrations.map(async (reg: Registration) => {
            const user = await db.getUserById(reg.user_id);
            return user ? { email: user.email, name: user.name } : null;
          })
        );

        const validAttendees = attendees.filter((a): a is { email: string; name: string } => a !== null);

        if (validAttendees.length > 0) {
          await notifyWorkoutCancellation(
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
            validAttendees
          );
        }
      }
    } catch (emailError) {
      // Log email error but don't fail the deletion
      console.error('Failed to send cancellation emails:', emailError);
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
