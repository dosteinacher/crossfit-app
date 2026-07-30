import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session || !session.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    const { is_admin } = await request.json();

    if (typeof is_admin !== 'boolean') {
      return NextResponse.json({ error: 'is_admin must be a boolean' }, { status: 400 });
    }

    // Prevent removing your own admin rights
    if (userId === session.id && !is_admin) {
      return NextResponse.json(
        { error: 'You cannot remove your own admin rights' },
        { status: 400 }
      );
    }

    const user = await db.setUserAdmin(userId, is_admin);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Update user admin error:', error);
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
    if (!session || !session.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    // Prevent deleting yourself
    if (userId === session.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    const success = await db.deleteUser(userId);

    if (!success) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
