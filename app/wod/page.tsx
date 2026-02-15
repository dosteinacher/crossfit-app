'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

export default function WODPage() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchWorkouts();
    
    // Auto-refresh every 5 minutes
    const refreshInterval = setInterval(fetchWorkouts, 5 * 60 * 1000);
    
    // Update clock every second
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const fetchWorkouts = async () => {
    try {
      const response = await fetch('/api/workouts/today');
      if (response.ok) {
        const data = await response.json();
        setWorkouts(data.workouts);
      }
    } catch (error) {
      console.error('Fetch workouts error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pure-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pure-green mx-auto"></div>
          <p className="text-pure-white text-2xl mt-4">Loading workout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pure-dark py-12 px-8">
      {/* Header with current time */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-6xl font-bold text-pure-green mb-2">
              Workout of the Day
            </h1>
            <p className="text-3xl text-pure-text-light">
              {format(currentTime, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-bold text-pure-white">
              {format(currentTime, 'h:mm:ss a')}
            </p>
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-pure-green to-coastal-sky rounded-full"></div>
      </div>

      {/* Workouts */}
      <div className="max-w-6xl mx-auto space-y-8">
        {workouts.length === 0 ? (
          <div className="bg-pure-gray border-2 border-gray-700 rounded-2xl p-16 text-center">
            <div className="text-8xl mb-6">💪</div>
            <h2 className="text-5xl font-bold text-pure-white mb-4">
              No Workouts Scheduled
            </h2>
            <p className="text-3xl text-pure-text-light">
              Check back tomorrow for the next workout!
            </p>
          </div>
        ) : (
          workouts.map((workout, index) => (
            <div
              key={workout.id}
              className="bg-pure-gray border-2 border-gray-700 rounded-2xl p-10 shadow-2xl hover:border-pure-green transition-all duration-300"
            >
              {/* Workout header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-6">
                  <div className="text-7xl font-bold text-pure-green">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-2xl font-medium px-6 py-2 bg-coastal-sky/20 text-coastal-sky border-2 border-coastal-sky/50 rounded-xl">
                        {workout.workout_type}
                      </span>
                      <span className="text-3xl font-bold text-pure-white">
                        {format(new Date(workout.date), 'h:mm a')}
                      </span>
                    </div>
                    <h2 className="text-5xl font-bold text-pure-white mt-2">
                      {workout.title}
                    </h2>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl text-pure-text-light mb-2">Participants</p>
                  <p className="text-4xl font-bold text-pure-green">
                    {workout.registered_count}/{workout.max_participants}
                  </p>
                </div>
              </div>

              {/* Workout description */}
              {workout.description && (
                <div className="mt-8 bg-pure-dark border border-gray-700 rounded-xl p-8">
                  <h3 className="text-3xl font-bold text-pure-white mb-4">
                    Description
                  </h3>
                  <p className="text-2xl text-pure-text-light whitespace-pre-wrap leading-relaxed">
                    {workout.description}
                  </p>
                </div>
              )}

              {/* Workout footer */}
              <div className="mt-6 pt-6 border-t border-gray-700 flex items-center justify-between">
                <p className="text-xl text-pure-text-light">
                  Created by <span className="font-semibold text-pure-white">{workout.creator_name}</span>
                </p>
                {new Date(workout.date) < new Date() ? (
                  <span className="text-xl font-medium px-4 py-2 bg-gray-700 text-gray-400 rounded-lg">
                    Completed
                  </span>
                ) : new Date(workout.date) > new Date() ? (
                  <span className="text-xl font-medium px-4 py-2 bg-green-900 text-green-200 rounded-lg">
                    Upcoming
                  </span>
                ) : (
                  <span className="text-xl font-medium px-4 py-2 bg-pure-green text-pure-dark rounded-lg">
                    In Progress
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-12 text-center">
        <div className="inline-block bg-pure-gray border border-gray-700 rounded-xl px-8 py-4">
          <p className="text-xl text-pure-text-light">
            Visit <span className="font-bold text-pure-green">go-pure.ch</span> to register
          </p>
        </div>
      </div>
    </div>
  );
}
