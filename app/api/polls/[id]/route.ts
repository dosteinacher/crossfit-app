-e export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';

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
    const pollId = parseInt(id);

    const poll = await db.getPollById(pollId);
    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    const creator = await db.getUserById(poll.created_by);
    const options = await db.getPollOptions(pollId);
    const userVotes = await db.getUserVotesForPoll(pollId, session.id);

    // Get template if linked
    let template = null;
    if (poll.template_id) {
      template = await db.getWorkoutTemplateById(poll.template_id);
    }

    // Enrich options with vote counts and voter names
    const enrichedOptions = await Promise.all(
      options.map(async (option) => {
        const votes = await db.getPollVotes(option.id);
        const voters = await Promise.all(
          votes.map(async (vote) => {
            const user = await db.getUserById(vote.user_id);
            return user?.name || 'Unknown';
          })
        );

        return {
          ...option,
          vote_count: votes.length,
          voters,
          user_voted: userVotes.includes(option.id),
        };
      })
    );

    const enrichedPoll = {
      ...poll,
      creator_name: creator?.name || 'Unknown',
      options: enrichedOptions,
      template,
    };

    return NextResponse.json({ poll: enrichedPoll });
  } catch (error) {
    console.error('Get poll error:', error);
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
    const pollId = parseInt(id);
    const body = await request.json();
    const { status } = body;

    if (!status || (status !== 'active' && status !== 'closed')) {
      return NextResponse.json(
        { error: 'Valid status required' },
        { status: 400 }
      );
    }

    const updatedPoll = await db.updatePollStatus(pollId, status);
    if (!updatedPoll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    return NextResponse.json({ poll: updatedPoll });
  } catch (error) {
    console.error('Update poll error:', error);
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

    // Only admins can delete polls
    if (!session.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const pollId = parseInt(id);

    const success = await db.deletePoll(pollId);
    if (!success) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Poll deleted successfully' });
  } catch (error) {
    console.error('Delete poll error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
