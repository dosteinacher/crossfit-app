import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie, verifyPassword, newHashForMigration } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await db.getUserById(session.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const stats = await db.getUserStats(session.id);
    const prefs = await db.getUserNotificationPrefs(session.id);
    const calendarToken = await db.getOrCreateCalendarToken(session.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin,
        created_at: user.created_at,
        ...prefs,
        calendar_token: calendarToken,
      },
      stats,
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'update_name') {
      const { name } = body;
      if (!name?.trim()) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }
      const updated = await db.updateUserProfile(session.id, name.trim());
      return NextResponse.json({ user: updated });
    }

    if (action === 'change_password') {
      const { current_password, new_password } = body;
      if (!current_password || !new_password) {
        return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
      }
      if (new_password.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
      }

      const user = await db.getUserById(session.id);
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const { valid } = await verifyPassword(current_password, user.password_hash);
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }

      const newHash = await newHashForMigration(new_password);
      await db.updateUserPasswordHash(session.id, newHash);
      return NextResponse.json({ message: 'Password updated' });
    }

    if (action === 'update_notifications') {
      const { notify_updates, notify_cancellations } = body;
      await db.updateNotificationPrefs(
        session.id,
        notify_updates ?? true,
        notify_cancellations ?? true
      );
      return NextResponse.json({ message: 'Preferences saved' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Profile PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
