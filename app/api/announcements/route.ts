import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = getSessionFromCookie(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const announcements = await db.getAnnouncements(true);
  return NextResponse.json({ announcements });
}

export async function POST(request: NextRequest) {
  const session = getSessionFromCookie(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { title, body } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const announcement = await db.createAnnouncement(title.trim(), (body || '').trim(), session.id);
  return NextResponse.json({ announcement }, { status: 201 });
}
