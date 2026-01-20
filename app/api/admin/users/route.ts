-e export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session || !session.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const users = await db.getAllUsers();

    // Enrich users with their stats
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const stats = await db.getUserStats(user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          is_admin: user.is_admin,
          created_at: user.created_at,
          stats,
        };
      })
    );

    return NextResponse.json({ users: enrichedUsers });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
