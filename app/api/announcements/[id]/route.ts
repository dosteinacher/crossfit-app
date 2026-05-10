import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionFromCookie(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await params;
  await db.deactivateAnnouncement(parseInt(id));
  return NextResponse.json({ message: 'Announcement removed' });
}
