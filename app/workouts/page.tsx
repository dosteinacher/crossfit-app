'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
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
  const PAGE_SIZE = 12;

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
  }, [filter, loading, ratingFilter]);

  const fetchWorkouts = async () => {
    try {
      const url = filter === 'upcoming' ? '/api/workouts?filter=upcoming' : '/api/workouts';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Could not load workouts');
      const data = await response.json();
      let filtered: WorkoutWithDetails[] = data.workouts || [];

      if (filter === 'mine') {
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
  };

  const handleRegistration = async (workoutId: number, isRegistered: boolean) => {
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
      <main className="min-h-screen bg-canvas py-6 md:py-10">
        <div className="mx-auto max-w-[1120px] px-4">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-display text-4xl font-extrabold text-ink md:text-5xl">Workouts</h1>
            <div className="flex items-center gap-2">
              <a href="/api/export/workouts-txt" download className="inline-flex min-h-11 items-center rounded-sm border border-line bg-paper px-4 text-sm font-bold text-ink hover:bg-canvas">
                Export as TXT
              </a>
            </div>
          </div>

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
                      <h2 className="font-display text-2xl font-bold uppercase leading-[.95]">{workout.title}</h2>
                    </Link>
                    <WorkoutFormatStamps description={description} />
                    {hasDescription && (
                      <p className="mt-3 line-clamp-2 whitespace-pre-line text-base leading-snug text-ink-2">
                        {description}
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line-2 pt-4">
                      <CapacityBar value={workout.registered_count} max={workout.max_participants} />
                      <StatusAction
                        status={status}
                        disabled={pending || (full && !workout.is_registered)}
                        onJoin={() => void handleRegistration(workout.id, false)}
                        onUnregister={() => void handleRegistration(workout.id, true)}
                      />
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
