export const runtime = 'edge';


import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { poll_option_id } = body;

    if (!poll_option_id) {
      return NextResponse.json(
        { error: 'Poll option ID required' },
        { status: 400 }
      );
    }

    const vote = await db.createPollVote(poll_option_id, session.id);

    return NextResponse.json({ vote }, { status: 201 });
  } catch (error) {
    console.error('Create vote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { poll_option_id } = body;

    if (!poll_option_id) {
      return NextResponse.json(
        { error: 'Poll option ID required' },
        { status: 400 }
      );
    }

    const success = await db.deletePollVote(poll_option_id, session.id);
    if (!success) {
      return NextResponse.json({ error: 'Vote not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Vote removed successfully' });
  } catch (error) {
    console.error('Delete vote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
