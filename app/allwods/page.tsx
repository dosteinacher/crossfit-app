'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { Card, Loading } from '@/components/ui';

interface WodListItem {
  id: number;
  title: string;
  description: string;
  workout_type: string;
  date: string;
  max_participants: number;
  creator_name: string;
  registered_count: number;
}

export default function AllWodsPage() {
  const [workouts, setWorkouts] = useState<WodListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);

      fetch(`/api/workouts/all?${params}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          setWorkouts(data.workouts || []);
          setLoading(false);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') setLoading(false);
        });
    }, 250); // debounce search-as-you-type

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-pure-dark py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Image
            src="/go-pure-logo.png"
            alt="PURE"
            width={140}
            height={40}
            className="h-9 w-auto max-h-9 shrink-0 object-contain object-left"
            priority
          />
          <h1 className="text-3xl font-bold text-pure-green">All Workouts</h1>
        </div>

        {/* Search */}
        <Card className="mb-6 bg-pure-gray border-gray-700">
          <input
            type="text"
            placeholder="Search workouts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-pure-dark border border-gray-600 text-pure-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-pure-green"
          />
        </Card>

        {loading ? (
          <Loading />
        ) : workouts.length === 0 ? (
          <Card className="bg-pure-gray border-gray-700 text-center py-12">
            <p className="text-gray-300 text-lg">
              {searchQuery ? `No workouts found for "${searchQuery}"` : 'No workouts yet'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {workouts.map((workout) => (
              <Card key={workout.id} className="bg-pure-gray border-gray-700">
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <span className="text-sm font-medium px-3 py-1 bg-coastal-sky/20 text-coastal-sky border border-coastal-sky/50 rounded-lg">
                    {workout.workout_type}
                  </span>
                  <span className="text-sm text-gray-400">
                    {format(new Date(workout.date), 'MMM d, yyyy · h:mm a')}
                  </span>
                </div>

                <p className="text-lg text-pure-white whitespace-pre-wrap mb-3">
                  {workout.description || 'No workout details provided'}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-400 pt-3 border-t border-gray-700">
                  <span>
                    Created by <span className="text-pure-white font-medium">{workout.creator_name}</span>
                  </span>
                  <span>
                    {workout.registered_count}/{workout.max_participants} participants
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <a
            href="https://go-pure.ch/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-pure-gray border border-gray-700 rounded-lg px-6 py-3 hover:border-pure-green hover:bg-pure-dark transition-all duration-300"
          >
            <p className="text-lg font-bold text-pure-green">go-pure.ch login</p>
          </a>
        </div>
      </div>
    </div>
  );
}
