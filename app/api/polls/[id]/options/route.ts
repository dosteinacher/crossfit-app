import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';
import { notifyPollOptionAdded } from '@/lib/email';

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

    // Notify poll creator + everyone who already voted (minus the adder).
    // Fire-and-forget — don't block the response.
    (async () => {
      try {
        const [adder, voterIds] = await Promise.all([
          db.getUserById(session.id),
          db.getDistinctVotersForPoll(pollId),
        ]);
        if (!adder) return;

        const recipientIds = new Set<number>(voterIds);
        if (poll.created_by !== session.id) recipientIds.add(poll.created_by);
        recipientIds.delete(session.id); // never notify self

        if (recipientIds.size === 0) return;

        const users = (
          await Promise.all(
            Array.from(recipientIds).map(async (uid) => {
              const u = await db.getUserById(uid);
              if (!u) return null;
              const prefs = await db.getUserNotificationPrefs(uid);
              if (prefs.notify_updates === false) return null;
              return { email: u.email, name: u.name };
            })
          )
        ).filter(Boolean) as { email: string; name: string }[];

        if (users.length === 0) return;

        await notifyPollOptionAdded(
          { id: poll.id, title: poll.title },
          { date, label },
          { email: adder.email, name: adder.name },
          users
        );
      } catch (e) {
        console.error('Poll option notify error:', e);
      }
    })();

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
