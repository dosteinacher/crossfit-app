import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const pollId = parseInt(id);
    const body = await request.json();
    const { date, label } = body;

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    // Check if poll exists
    const poll = await db.getPollById(pollId);
    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Create new poll option
    const option = await db.createPollOption(pollId, date, label);

    return NextResponse.json({ option });
  } catch (error) {
    console.error('Create poll option error:', error);
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

    const { searchParams } = new URL(request.url);
    const optionId = searchParams.get('option_id');

    if (!optionId) {
      return NextResponse.json(
        { error: 'option_id is required' },
        { status: 400 }
      );
    }

    const success = await db.deletePollOption(parseInt(optionId));
    if (!success) {
      return NextResponse.json(
        { error: 'Poll option not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Poll option deleted successfully' });
  } catch (error) {
    console.error('Delete poll option error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
