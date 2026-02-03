import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';
import { User } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const users = await db.getAllUsers();

    // Return basic user info for dropdown
    const userList = users.map((user: User) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    }));

    return NextResponse.json({ users: userList });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
