'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Loading, Button } from '@/components/ui';
import { format } from 'date-fns';

type RatingFilter = 'all' | 'unrated' | '1' | '2' | '3' | '4' | '5';

export default function WorkoutsPage() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (filter !== 'past') {
      setRatingFilter('all');
    }
  }, [filter]);

  useEffect(() => {
    if (!loading) {
      fetchWorkouts();
    }
  }, [filter, loading, ratingFilter]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      setLoading(false);
    } catch (error) {
      router.push('/login');
    }
  };

  const fetchWorkouts = async () => {
    try {
      const url = filter === 'upcoming' ? '/api/workouts?filter=upcoming' : '/api/workouts';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        let filtered = data.workouts;
        
        if (filter === 'past') {
          const now = new Date().toISOString();
          filtered = filtered.filter((w: any) => w.date < now);
          if (ratingFilter === 'unrated') {
            filtered = filtered.filter((w: any) => w.rating == null);
          } else if (ratingFilter !== 'all') {
            const n = Number(ratingFilter);
            filtered = filtered.filter((w: any) => Number(w.rating) === n);
          }
        }

        setWorkouts(filtered);
      }
    } catch (error) {
      console.error('Fetch workouts error:', error);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-dark py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-pure-white">Workouts</h1>
            <div className="flex gap-2">
              <a
                href="/api/export/workouts-txt"
                download
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold border-2 border-gray-600 text-pure-white hover:bg-pure-gray hover:border-gray-500 transition"
              >
                Export as TXT
              </a>
              <Link href="/workouts/create">
                <Button>Create Workout</Button>
              </Link>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6 border-b border-gray-700">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-4 py-2 font-medium transition ${
                  filter === 'upcoming'
                    ? 'text-pure-green border-b-2 border-pure-green'
                    : 'text-gray-400 hover:text-pure-white'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 font-medium transition ${
                  filter === 'all'
                    ? 'text-pure-green border-b-2 border-pure-green'
                    : 'text-gray-400 hover:text-pure-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('past')}
                className={`px-4 py-2 font-medium transition ${
                  filter === 'past'
                    ? 'text-pure-green border-b-2 border-pure-green'
                    : 'text-gray-400 hover:text-pure-white'
                }`}
              >
                Past
              </button>
            </div>
            {filter === 'past' && (
              <select
                id="workout-rating-filter"
                aria-label="Filter past workouts by difficulty rating"
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
                className="mb-2 rounded-lg border border-gray-700 bg-pure-gray text-pure-text-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pure-green focus:border-transparent"
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

          {/* Workouts List */}
          {workouts.length === 0 ? (
            <Card className="bg-pure-gray border-gray-700">
              <p className="text-gray-400 text-center py-8">No workouts found</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workouts.map((workout) => (
                <Link key={workout.id} href={`/workouts/${workout.id}`}>
                  <Card className="hover:shadow-xl hover:border-pure-green transition-all cursor-pointer h-full bg-pure-gray border-gray-700">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-medium px-2 py-1 bg-blue-900 text-blue-200 rounded">
                        {workout.workout_type}
                      </span>
                      {workout.is_registered && (
                        <span className="text-xs font-medium px-2 py-1 bg-green-900 text-green-200 rounded">
                          Registered
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-pure-white mb-2">
                      {workout.title}
                    </h3>
                    
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                      {workout.description || 'No description'}
                    </p>
                    
                    <div className="border-t border-gray-700 pt-3 mt-auto">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">
                          {format(new Date(workout.date), 'MMM d, h:mm a')}
                        </span>
                        <span className="text-gray-400">
                          {workout.registered_count}/{workout.max_participants}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        by {workout.creator_name}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
