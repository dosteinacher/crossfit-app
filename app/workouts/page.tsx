'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import PhotoHero from '@/components/PhotoHero';
import { Button, CapacityBar, Card, Loading, SegmentedControl, StatusAction } from '@/components/ui';
import WorkoutFormatStamps from '@/components/WorkoutFormatStamps';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import type { WorkoutWithDetails } from '@/lib/types';

type RatingFilter = 'all' | 'unrated' | '1' | '2' | '3' | '4' | '5';
type WorkoutFilter = 'all' | 'upcoming' | 'past' | 'mine';

const FILTERS: Array<{ label: string; value: WorkoutFilter }> = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'All', value: 'all' },
  { label: 'Past', value: 'past' },
  { label: 'My Schedule', value: 'mine' },
];

export default function WorkoutsPage() {
  const { loading } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>([]);
  const [filter, setFilter] = useState<WorkoutFilter>('upcoming');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [registering, setRegistering] = useState<number | null>(null);
  const [upcomingSummary, setUpcomingSummary] = useState({ count: 0, registered: 0 });
  const PAGE_SIZE = 12;

  const fetchWorkouts = useCallback(async () => {
    try {
      const response = await fetch(filter === 'upcoming' ? '/api/workouts?filter=upcoming' : '/api/workouts');
      if (!response.ok) throw new Error('Could not load workouts');
      const data = await response.json();
      const allWorkouts: WorkoutWithDetails[] = data.workouts || [];
      const now = new Date();
      const upcoming = filter === 'upcoming'
        ? allWorkouts
        : allWorkouts.filter((workout) => new Date(workout.date) > now);
      setUpcomingSummary({
        count: upcoming.length,
        registered: upcoming.filter((workout) => workout.is_registered).length,
      });
      let filtered = allWorkouts;

      if (filter === 'upcoming') {
        filtered = allWorkouts;
      } else if (filter === 'mine') {
        filtered = filtered.filter((workout) => workout.is_registered);
      } else if (filter === 'past') {
        const now = new Date().toISOString();
        filtered = filtered.filter((workout) => workout.date < now);
        if (ratingFilter === 'unrated') {
          filtered = filtered.filter((workout) => workout.rating == null);
        } else if (ratingFilter !== 'all') {
          const rating = Number(ratingFilter);
          filtered = filtered.filter((workout) => Number(workout.rating) === rating);
        }
      }

      setWorkouts(filtered);
    } catch (error) {
      console.error('Fetch workouts error:', error);
    }
  }, [filter, ratingFilter]);

  useEffect(() => {
    if (filter !== 'past') setRatingFilter('all');
    setSearch('');
    setPage(1);
  }, [filter]);

  useEffect(() => {
    setPage(1);
  }, [search, ratingFilter]);

  useEffect(() => {
    if (!loading) void fetchWorkouts();
  }, [fetchWorkouts, loading]);

  const handleRegistration = async (workoutId: number, isRegistered: boolean) => {
    const isUpcoming = workouts.some(
      (workout) => workout.id === workoutId && new Date(workout.date) > new Date()
    );
    setRegistering(workoutId);
    try {
      const response = await fetch(`/api/workouts/${workoutId}/register`, {
        method: isRegistered ? 'DELETE' : 'POST',
      });
      if (!response.ok) throw new Error('Could not update workout registration');
      setWorkouts((current) => current.map((workout) => (
        workout.id === workoutId
          ? {
              ...workout,
              is_registered: !isRegistered,
              registered_count: Math.max(0, workout.registered_count + (isRegistered ? -1 : 1)),
            }
          : workout
      )));
      if (isUpcoming) {
          setUpcomingSummary((summary) => ({
            ...summary,
            registered: Math.max(0, summary.registered + (isRegistered ? -1 : 1)),
          }));
      }
    } catch (error) {
      console.error('Workout registration error:', error);
    } finally {
      setRegistering(null);
    }
  };

  const query = search.trim().toLowerCase();
  const filteredWorkouts = query
    ? workouts.filter((workout) =>
        workout.title?.toLowerCase().includes(query) ||
        workout.description?.toLowerCase().includes(query) ||
        workout.creator_name?.toLowerCase().includes(query)
      )
    : workouts;
  const displayedWorkouts = filteredWorkouts.slice(0, page * PAGE_SIZE);
  const hasMore = displayedWorkouts.length < filteredWorkouts.length;

  if (loading) return <Loading />;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-canvas pb-6 md:pb-10">
        <PhotoHero image="/images/gym-storage.jpg" imageAlt="PURE gym rig and equipment storage" objectPosition="center 48%" className="h-[240px]">
          <header className="mx-auto flex h-full max-w-[1120px] flex-wrap items-end justify-between gap-4 px-4 pb-7 pt-8">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[.14em] text-lime">Box mode · Training schedule</p>
              <h1 className="mt-2 font-display text-[58px] font-black leading-[.82] tracking-[-.01em] text-white md:text-[96px]">Workouts</h1>
              <p className="mt-3 text-[13px] font-bold uppercase tracking-wide text-lime">
                {upcomingSummary.count} upcoming · {upcomingSummary.registered} you&apos;re in
              </p>
            </div>
            <a href="/api/export/workouts-txt" download className="inline-flex min-h-11 items-center rounded-sm border border-white/70 bg-white/[.96] px-4 text-sm font-bold text-ink hover:bg-white">
              Export as TXT
            </a>
          </header>
        </PhotoHero>

        <div className="mx-auto max-w-[1120px] px-4 py-6 md:py-10">

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl items={FILTERS} value={filter} onChange={setFilter} ariaLabel="Filter workouts" className="max-w-full" />
            {filter === 'past' && (
              <select
                id="workout-rating-filter"
                aria-label="Filter past workouts by difficulty rating"
                value={ratingFilter}
                onChange={(event) => setRatingFilter(event.target.value as RatingFilter)}
                className="min-h-11 rounded-sm border border-line bg-paper px-3 text-base text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
              >
                <option value="all">All ratings</option>
                <option value="1">1 — easiest</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5 — hardest</option>
                <option value="unrated">No rating</option>
              </select>
            )}
          </div>

          <div className="mb-6">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, description, or coach…"
              aria-label="Search workouts"
              className="min-h-11 w-full rounded-sm border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
            />
          </div>

          {filteredWorkouts.length === 0 ? (
            <Card>
              <p className="py-4 text-center text-base text-ink-2">No workouts found.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayedWorkouts.map((workout) => {
                const full = workout.registered_count >= workout.max_participants;
                const status = workout.is_registered ? 'registered' : full ? 'full' : 'open';
                const pending = registering === workout.id;
                const description = workout.description?.trim() || '';
                const hasDescription = Boolean(description && !/^(?:\.{3,}|…)+$/.test(description.replace(/\s/g, '')));
                return (
                  <Card key={workout.id} className="flex h-full flex-col !p-5">
                    <div className="flex items-start justify-between gap-3">
                      <time className="text-[15px] font-bold tabular-nums text-ink">{format(new Date(workout.date), 'EEE, MMM d · HH:mm')}</time>
                      <span className="shrink-0 text-[13px] text-ink-2">by {workout.creator_name}</span>
                    </div>
                    {workout.workout_type.toLowerCase() !== 'general' && (
                      <span className="mt-3 w-fit rounded-full bg-canvas px-2.5 py-1 text-[13px] font-bold uppercase tracking-wide text-ink-2">
                        {workout.workout_type}
                      </span>
                    )}
                    <Link href={`/workouts/${workout.id}`} className="mt-3 text-ink hover:underline">
                      <h2 className="font-display text-2xl font-black uppercase leading-[.9] tracking-[-.01em]">{workout.title}</h2>
                    </Link>
                    <WorkoutFormatStamps title={workout.title} description={description} showScoreboard />
                    {hasDescription && (
                      <p className="mt-3 line-clamp-2 whitespace-pre-line text-base leading-snug text-ink-2">
                        {description}
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line-2 pt-4">
                      <CapacityBar value={workout.registered_count} max={workout.max_participants} />
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/workouts/${workout.id}/board`} className="inline-flex min-h-11 items-center rounded-sm border border-line bg-paper px-3 text-[13px] font-bold text-ink hover:bg-canvas">
                          Board
                        </Link>
                        <StatusAction
                          status={status}
                          disabled={pending || (full && !workout.is_registered)}
                          onJoin={() => void handleRegistration(workout.id, false)}
                          onUnregister={() => void handleRegistration(workout.id, true)}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {hasMore && (
            <div className="mt-7 text-center">
              <Button variant="secondary" onClick={() => setPage((current) => current + 1)}>
                Load more ({filteredWorkouts.length - displayedWorkouts.length} remaining)
              </Button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
