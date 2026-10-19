import WodScreenWake from '@/components/WodScreenWake';
import WodClock from '@/components/WodClock';
import { db } from '@/lib/db';
import { format } from 'date-fns';
import { Metadata } from 'next';
import Image from 'next/image';
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

  return (
    <div className="wod-screen min-h-screen bg-canvas px-8 py-4 text-ink">
      <WodScreenWake />
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-1">
        <div className="flex items-center justify-between mb-2 gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <Image
              src="/go-pure-logo.png"
              alt="PURE"
              width={140}
              height={40}
              className="h-9 w-auto max-h-9 shrink-0 object-contain object-left navbar-brand-spin"
              priority
            />
            <div className="min-w-0">
              <h1 className="mb-2 font-display text-4xl font-extrabold text-ink">
                Workout of the Day
              </h1>
            </div>
          </div>
          <WodClock />
        </div>
        <div className="h-1 rounded-full bg-gradient-to-r from-lime to-ink-2"></div>
      </div>

      {/* Workouts */}
      <div className="max-w-6xl mx-auto space-y-4 mt-2">
        {workouts.length === 0 ? (
          <div className="rounded-lg border border-line bg-paper p-8 text-center shadow-card">
            <h2 className="mb-3 font-display text-3xl font-extrabold text-ink">
              No Workouts Scheduled
            </h2>
            <p className="text-xl text-ink-2">
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
                className="rounded-lg border border-line bg-paper p-4 shadow-card"
              >
                {/* Workout header - all on one line, no wrap */}
                <div className="flex items-center gap-4 mb-3 flex-nowrap min-w-0">
                  <div className="shrink-0 rounded-sm bg-lime px-2 py-1 text-3xl font-extrabold tabular-nums text-ink">
                    #{index + 1}
                  </div>
                  <div className="flex items-center gap-3 min-w-0 flex-1 flex-nowrap overflow-hidden">
                    {workout.workout_type.toLowerCase() !== 'general' && (
                      <span className="shrink-0 rounded-sm border border-line bg-canvas px-3 py-1 text-xl font-bold text-ink-2">
                        {workout.workout_type}
                      </span>
                    )}
                    <span className="shrink-0 whitespace-nowrap text-2xl font-bold tabular-nums text-ink">
                      {format(workoutDate, 'h:mm a')}
                    </span>
                    <h2 className="min-w-0 shrink truncate font-display text-3xl font-extrabold text-ink">
                      {workout.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                    <span className="text-xl text-ink-2">Participants</span>
                    <span className="text-3xl font-extrabold tabular-nums text-ink">
                      {workout.registered_count}/{workout.max_participants}
                    </span>
                  </div>
                </div>

                {/* Workout description: manually split into two columns when long enough.
                    Manual split is used (instead of CSS columns-2) because some Smart-TV
                    browsers refuse to break a single <p> across columns, leaving the
                    right column blank. */}
                {workout.description && (() => {
                  const lines = workout.description.split('\n');
                  // Up to 15 lines: single column. More: 15 on left, rest on right.
                  const LEFT_MAX = 15;
                  const useTwoColumns = lines.length > LEFT_MAX;
                  const bodyClass =
                    'whitespace-pre-wrap text-xl leading-relaxed text-ink';

                  let leftText = workout.description;
                  let rightText = '';
                  if (useTwoColumns) {
                    // Aim for 15 on the left, but nudge to a nearby blank line so
                    // logical sections stay together (search ±3 lines around 15).
                    let splitAt = LEFT_MAX;
                    for (let i = 0; i < 3; i++) {
                      if (lines[splitAt - 1] !== undefined && lines[splitAt - 1].trim() === '') break;
                      if (lines[splitAt + i] !== undefined && lines[splitAt + i].trim() === '') {
                        splitAt = splitAt + i + 1; // include the blank in the left side
                        break;
                      }
                      if (lines[splitAt - i - 1] !== undefined && lines[splitAt - i - 1].trim() === '') {
                        splitAt = splitAt - i;
                        break;
                      }
                    }
                    leftText = lines.slice(0, splitAt).join('\n').replace(/\s+$/, '');
                    rightText = lines.slice(splitAt).join('\n').replace(/^\s+/, '');
                  }

                  return (
                    <div className="mt-4 rounded-lg border border-line-2 bg-canvas p-4">
                      <h3 className="mb-3 font-display text-2xl font-extrabold text-ink">
                        Description
                      </h3>
                      {useTwoColumns ? (
                        <div className="grid grid-cols-2 gap-8">
                          <p className={bodyClass}>{leftText}</p>
                          <p className={bodyClass}>{rightText}</p>
                        </div>
                      ) : (
                        <p className={bodyClass}>{workout.description}</p>
                      )}
                    </div>
                  );
                })()}

                {/* Workout footer */}
                <div className="mt-3 flex items-center justify-between border-t border-line-2 pt-3">
                  <p className="text-xl text-ink-2">
                    Created by <span className="font-bold text-ink">{workout.creator_name}</span>
                  </p>
                  {workoutDate < now ? (
                    <span className="rounded-sm bg-canvas px-3 py-1 text-xl font-bold text-ink-2">
                      Completed
                    </span>
                  ) : workoutDate > now ? (
                    <span className="rounded-sm bg-lime px-3 py-1 text-xl font-bold text-ink">
                      Upcoming
                    </span>
                  ) : (
                    <span className="rounded-sm bg-ink px-3 py-1 text-xl font-bold text-white">
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
          className="inline-block rounded-sm border border-line bg-paper px-6 py-3 shadow-card transition-colors hover:border-ink hover:bg-canvas"
        >
          <p className="text-xl font-bold text-ink">
            go-pure.ch login
          </p>
        </a>
      </div>
    </div>
  );
}
