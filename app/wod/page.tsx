import { db } from '@/lib/db';
import { format } from 'date-fns';
import { Metadata } from 'next';
import { Workout } from '@/lib/types';

// ISR: Regenerate page every 30 seconds
export const revalidate = 30;

// Meta refresh for browser auto-reload (Smart TV compatible)
export const metadata: Metadata = {
  title: 'Workout of the Day - PURE',
  other: {
    'http-equiv': 'refresh',
    content: '30',
  },
};

async function getWorkoutsForToday() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const startDate = startOfDay.toISOString();
  const endDate = endOfDay.toISOString();

  // Fetch workouts for today
  const workouts = await db.getWorkoutsByDateRange(startDate, endDate);

  // Enrich workouts with creator info and registration counts
  const enrichedWorkouts = await Promise.all(
    workouts.map(async (workout: Workout) => {
      const creator = await db.getUserById(workout.created_by);
      const registrations = await db.getRegistrationsForWorkout(workout.id);

      return {
        ...workout,
        creator_name: creator?.name || 'Unknown',
        registered_count: registrations.length,
      };
    })
  );

  return enrichedWorkouts;
}

export default async function WODPage() {
  const workouts = await getWorkoutsForToday();
  const currentTime = new Date();

  return (
    <div className="min-h-screen bg-pure-dark py-4 px-8">
      {/* Header with current time */}
      <div className="max-w-6xl mx-auto mb-1">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold text-pure-green mb-2">
              Workout of the Day
            </h1>
            <p className="text-xl text-pure-text-light">
              {format(currentTime, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-pure-white">
              {format(currentTime, 'h:mm a')}
            </p>
            <p className="text-sm text-gray-400 mt-1">Last updated</p>
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-pure-green to-coastal-sky rounded-full"></div>
      </div>

      {/* Workouts */}
      <div className="max-w-6xl mx-auto space-y-4 mt-2">
        {workouts.length === 0 ? (
          <div className="bg-pure-gray border border-gray-700 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">💪</div>
            <h2 className="text-3xl font-bold text-pure-white mb-3">
              No Workouts Scheduled
            </h2>
            <p className="text-xl text-pure-text-light">
              Check back tomorrow for the next workout!
            </p>
          </div>
        ) : (
          workouts.map((workout, index) => {
            const workoutDate = new Date(workout.date);
            const now = new Date();
            
            return (
              <div
                key={workout.id}
                className="bg-pure-gray border border-gray-700 rounded-lg p-4 shadow-2xl"
              >
                {/* Workout header - all on one line, no wrap */}
                <div className="flex items-center gap-4 mb-3 flex-nowrap min-w-0">
                  <div className="text-4xl font-bold text-pure-green shrink-0">
                    #{index + 1}
                  </div>
                  <div className="flex items-center gap-3 min-w-0 flex-1 flex-nowrap overflow-hidden">
                    <span className="text-lg font-medium px-3 py-1 bg-coastal-sky/20 text-coastal-sky border border-coastal-sky/50 rounded-lg shrink-0">
                      {workout.workout_type}
                    </span>
                    <span className="text-xl font-bold text-pure-white shrink-0 whitespace-nowrap">
                      {format(workoutDate, 'h:mm a')}
                    </span>
                    <h2 className="text-2xl font-bold text-pure-white truncate min-w-0 shrink">
                      {workout.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                    <span className="text-base text-pure-text-light">Participants</span>
                    <span className="text-2xl font-bold text-pure-green">
                      {workout.registered_count}/{workout.max_participants}
                    </span>
                  </div>
                </div>

                {/* Workout description */}
                {workout.description && (
                  <div className="mt-4 bg-pure-dark border border-gray-700 rounded-lg p-4">
                    <h3 className="text-xl font-bold text-pure-white mb-2">
                      Description
                    </h3>
                    <p className="text-2xl text-pure-text-light whitespace-pre-wrap leading-relaxed">
                      {workout.description}
                    </p>
                  </div>
                )}

                {/* Workout footer */}
                <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
                  <p className="text-base text-pure-text-light">
                    Created by <span className="font-semibold text-pure-white">{workout.creator_name}</span>
                  </p>
                  {workoutDate < now ? (
                    <span className="text-base font-medium px-3 py-1 bg-gray-700 text-gray-400 rounded-lg">
                      Completed
                    </span>
                  ) : workoutDate > now ? (
                    <span className="text-base font-medium px-3 py-1 bg-green-900 text-green-200 rounded-lg">
                      Upcoming
                    </span>
                  ) : (
                    <span className="text-base font-medium px-3 py-1 bg-pure-green text-pure-dark rounded-lg">
                      In Progress
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-6 text-center">
        <a
          href="https://go-pure.ch/login"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-pure-gray border border-gray-700 rounded-lg px-6 py-3 hover:border-pure-green hover:bg-pure-dark transition-all duration-300 cursor-pointer"
        >
          <p className="text-xl font-bold text-pure-green">
            go-pure.ch login
          </p>
        </a>
      </div>
    </div>
  );
}
