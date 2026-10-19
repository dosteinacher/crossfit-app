'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import CalendarView from '@/components/CalendarView';
import { Badge, Card, Loading, SegmentedControl } from '@/components/ui';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

type PollFilter = 'all' | 'active' | 'closed';

const POLL_FILTERS: Array<{ label: string; value: PollFilter }> = [
  { label: 'Active', value: 'active' },
  { label: 'All', value: 'all' },
  { label: 'Closed', value: 'closed' },
];

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [pollFilter, setPollFilter] = useState<PollFilter>('active');

  useEffect(() => {
    if (!loading) {
      fetchData();
    }
  }, [pollFilter, loading]);

  const fetchData = async () => {
    try {
      // Fetch workouts
      const workoutsResponse = await fetch('/api/workouts');
      if (workoutsResponse.ok) {
        const workoutsData = await workoutsResponse.json();
        setWorkouts(workoutsData.workouts);
      }

      // Fetch polls
      const params = new URLSearchParams();
      if (pollFilter !== 'all') params.append('status', pollFilter);

      const pollsResponse = await fetch(`/api/polls?${params}`);
      if (pollsResponse.ok) {
        const pollsData = await pollsResponse.json();
        setPolls(pollsData.polls);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-canvas py-6 md:py-10">
        <div className="mx-auto max-w-[1120px] space-y-12 px-4">
          {/* Calendar Section */}
          <CalendarView workouts={workouts} canCreateWorkout={Boolean(user?.is_admin)} />

          {/* Polls Section */}
          <section className="border-t border-line pt-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-extrabold uppercase text-ink md:text-4xl">Availability Polls</h2>
                <p className="mt-2 text-base text-ink-2">Find a time that works for the team.</p>
              </div>
              <Link href="/calendar/create" className="inline-flex min-h-11 items-center rounded-sm border border-line bg-paper px-4 text-sm font-bold text-ink hover:bg-canvas">
                Create Poll
              </Link>
            </div>

            {/* Poll Filter Tabs */}
            <div className="mb-5">
              <SegmentedControl items={POLL_FILTERS} value={pollFilter} onChange={setPollFilter} ariaLabel="Filter availability polls" />
            </div>

            {/* Polls List */}
            {polls.length === 0 ? (
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-base text-ink-2">No availability polls yet.</p>
                  <Link href="/calendar/create" className="inline-flex min-h-11 items-center rounded-sm bg-lime px-4 text-[15px] font-bold text-ink hover:brightness-95">Create a poll</Link>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {polls.map((poll) => (
                  <Link key={poll.id} href={`/calendar/${poll.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15">
                    <Card className="transition-colors hover:border-ink">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-display text-2xl font-bold uppercase text-ink">
                              {poll.title}
                            </h3>
                            <Badge variant={poll.status === 'active' ? 'neutral' : 'outline'}>{poll.status}</Badge>
                          </div>
                          
                          {poll.description && (
                            <p className="mb-3 text-base text-ink-2">
                              {poll.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-2">
                            <span>{poll.option_count} time slots</span>
                            <span>{poll.total_voters} voters</span>
                            <span>by {poll.creator_name}</span>
                          </div>
                        </div>

                        <div className="text-[13px] text-ink-2">
                          {format(new Date(poll.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
