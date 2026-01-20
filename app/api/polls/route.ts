export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as 'active' | 'closed' | null;

    const polls = await db.getPolls(status || undefined);

    // Enrich polls with creator info and vote counts
    const enrichedPolls = await Promise.all(
      polls.map(async (poll) => {
        const creator = await db.getUserById(poll.created_by);
        const options = await db.getPollOptions(poll.id);
        
        const optionsWithVotes = await Promise.all(
          options.map(async (option) => {
            const votes = await db.getPollVotes(option.id);
            return {
              ...option,
              vote_count: votes.length,
            };
          })
        );

        // Get unique voters across all options
        const allVotes = await Promise.all(
          options.map((o) => db.getPollVotes(o.id))
        );
        const totalVoters = new Set(
          allVotes.flat().map((v) => v.user_id)
        ).size;

        return {
          ...poll,
          creator_name: creator?.name || 'Unknown',
          option_count: options.length,
          total_voters: totalVoters,
        };
      })
    );

    return NextResponse.json({ polls: enrichedPolls });
  } catch (error) {
    console.error('Get polls error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, template_id, options } = body;

    // Validate input
    if (!title || !options || options.length === 0) {
      return NextResponse.json(
        { error: 'Title and at least one option are required' },
        { status: 400 }
      );
    }

    // Create poll
    const poll = await db.createPoll(
      title,
      description || '',
      template_id || null,
      session.id
    );

    // Create poll options
    for (const option of options) {
      await db.createPollOption(poll.id, option.date, option.label);
    }

    return NextResponse.json({ poll }, { status: 201 });
  } catch (error) {
    console.error('Create poll error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
