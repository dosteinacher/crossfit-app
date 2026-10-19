'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Avatar, CapacityBar, Card, Label, Loading, StatusAction } from '@/components/ui';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import type { Announcement, WorkoutWithDetails } from '@/lib/types';
import { parseWorkoutDescription } from '@/lib/workout-description';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [registering, setRegistering] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch('/api/workouts?filter=upcoming').then((response) => response.json()),
      fetch('/api/announcements').then((response) => response.json()),
    ])
      .then(([workoutData, announcementData]) => {
        setWorkouts(workoutData.workouts || []);
        setAnnouncements(announcementData.announcements || []);
      })
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [user]);

  const handleRegister = async (workoutId: number, isRegistered: boolean) => {
    setRegistering(workoutId);
    try {
      const response = await fetch(`/api/workouts/${workoutId}/register`, {
        method: isRegistered ? 'DELETE' : 'POST',
      });
      if (!response.ok) throw new Error('Could not update workout registration');
      setWorkouts((current) =>
        current.map((workout) =>
          workout.id === workoutId
            ? {
                ...workout,
                is_registered: !isRegistered,
                registered_count: Math.max(0, workout.registered_count + (isRegistered ? -1 : 1)),
              }
            : workout
        )
      );
    } catch (error) {
      console.error(error);
    } finally {
      setRegistering(null);
    }
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekEnd = addDays(weekStart, 7);
  const nextSevenEnd = addDays(today, 7);
  const upcomingWorkouts = workouts
    .filter((workout) => new Date(workout.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextWorkout = upcomingWorkouts[0] ?? null;
  const nextSeven = workouts
    .filter((workout) => {
      const date = new Date(workout.date);
      return date >= today && date < nextSevenEnd;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const registeredThisWeek = workouts.filter((workout) => {
    const date = new Date(workout.date);
    return date >= weekStart && date < weekEnd && workout.is_registered;
  }).length;

  if (loading || dataLoading) return <Loading />;

  const firstName = user?.name.split(/\s+/)[0] || 'there';
  const announcement = announcements[0];
  const greeting = getGreeting();
  const heroParts = nextWorkout?.description ? parseWorkoutDescription(nextWorkout.description).slice(0, 3) : [];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-canvas py-6 md:py-10">
        <div className="mx-auto max-w-[1120px] space-y-8 px-4">
          <header className={`grid gap-5 ${announcement ? 'md:grid-cols-[1.2fr_.8fr] md:items-center' : ''}`}>
            <div>
              <Label>{format(now, "EEEE '·' d MMMM").toUpperCase()}</Label>
              <h1 className="mt-3 font-display text-[44px] font-extrabold leading-[.9] text-ink md:text-[72px]" style={{ textTransform: 'none' }}>
                {greeting}, {firstName}.
              </h1>
              <p className="mt-3 text-base text-ink-2">You&apos;re in for <strong className="font-bold text-ink">{registeredThisWeek} sessions</strong> this week.</p>
            </div>
            {announcement && (
              <div className="flex min-h-14 items-center gap-3 rounded-lg border border-line bg-paper px-4 py-3">
                <span className="inline-flex min-h-7 shrink-0 items-center rounded-md bg-ink px-2 text-[13px] font-bold text-white">NEWS</span>
                <span className="truncate font-semibold text-ink">{announcement.title}</span>
              </div>
            )}
          </header>

          <section className={`grid gap-5 ${nextWorkout ? 'md:grid-cols-[1.55fr_1fr]' : ''}`}>
            {nextWorkout && (() => {
              const date = new Date(nextWorkout.date);
              const full = nextWorkout.registered_count >= nextWorkout.max_participants;
              const dateLabel = date.toDateString() === addDays(today, 1).toDateString()
                ? `Tomorrow · ${format(date, 'EEE d MMM')}`
                : format(date, 'EEE d MMM');
              const status = nextWorkout.is_registered
                ? 'YOU’RE IN'
                : full
                  ? `FULL · ${nextWorkout.registered_count}/${nextWorkout.max_participants}`
                  : `OPEN · ${nextWorkout.registered_count}/${nextWorkout.max_participants}`;

              return (
                <article className="rounded-xl bg-ink p-5 text-white md:p-[30px]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-lime px-3 py-1 text-[13px] font-bold uppercase tracking-wide text-ink">Up next</span>
                      <span className="text-sm font-semibold text-white">{dateLabel}</span>
                    </div>
                    <span className="rounded-full border border-white/20 px-3 py-1 text-[13px] font-bold text-white">{status}</span>
                  </div>

                  <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end">
                    <time className="shrink-0 font-display text-[64px] font-extrabold leading-[.82] tabular-nums text-lime md:text-[104px]">
                      {format(date, 'HH:mm')}
                    </time>
                    <Link href={`/workouts/${nextWorkout.id}`} className="min-w-0 text-white hover:text-lime focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-lime/40">
                      <h2 className="font-display text-3xl font-extrabold uppercase leading-[.9] md:text-5xl">{nextWorkout.title}</h2>
                    </Link>
                  </div>

                  {heroParts.length > 0 ? (
                    <div className="mt-7 hidden grid-cols-1 gap-2 sm:grid sm:grid-cols-3">
                      {heroParts.map((part, index) => (
                        <div key={`${part.title}-${index}`} className="min-h-32 rounded-lg border border-[#2A2C27] bg-[#141512] p-3">
                          <p className="text-[13px] font-bold uppercase tracking-wide text-white">
                            {String(index + 1).padStart(2, '0')} · {part.title}{part.durationMinutes ? ` · ${part.durationMinutes}′` : ''}
                          </p>
                          <div className="mt-3 space-y-1 text-sm leading-snug text-white">
                            {part.movements.length ? part.movements.slice(0, 5).map((movement, movementIndex) => (
                              <p key={`${movement.movement}-${movementIndex}`} className="line-clamp-1">
                                {movement.reps ? `${movement.reps} ` : ''}{movement.movement}
                              </p>
                            )) : <p className="line-clamp-3">{nextWorkout.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/15 pt-5">
                    <div className="hidden min-w-0 items-center sm:flex">
                      <div className="flex -space-x-2">
                        {nextWorkout.participants.slice(0, 4).map((participant) => (
                          <Avatar key={participant.user_id} initials={getInitials(participant.user_name)} className="h-9 w-9 border-2 border-ink text-[13px]" />
                        ))}
                      </div>
                      <span className="ml-3 truncate text-sm text-white">
                        {nextWorkout.participants.slice(0, 3).map((participant) => participant.user_name.split(' ')[0]).join(', ')}
                        {nextWorkout.participants.length > 3 ? ` +${nextWorkout.participants.length - 3}` : ''}
                      </span>
                    </div>
                    <div className="sm:hidden">
                      <CapacityBar value={nextWorkout.registered_count} max={nextWorkout.max_participants} className="[&>span:last-child]:text-white [&>span>span]:bg-white" />
                    </div>
                    <Link href={`/workouts/${nextWorkout.id}/board`} className="inline-flex min-h-11 shrink-0 items-center rounded-sm bg-white px-4 text-sm font-bold text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-lime/40">
                      Open whiteboard →
                    </Link>
                  </div>
                </article>
              );
            })()}

            <Card className="flex flex-col !p-5 md:!p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label>This week</Label>
                  <p className="mt-2 text-sm font-medium text-ink-2">{format(weekStart, 'd MMM')} – {format(addDays(weekStart, 6), 'd MMM')}</p>
                </div>
                <span className="font-display text-5xl font-extrabold leading-none tabular-nums text-ink">{registeredThisWeek}</span>
              </div>
              <p className="mt-1 text-sm text-ink-2">booked sessions</p>

              <div className="mt-5 grid grid-cols-7 gap-1">
                {weekDays.map((day) => {
                  const isToday = isSameDay(day, today);
                  const hasRegistration = workouts.some((workout) => workout.is_registered && isSameDay(new Date(workout.date), day));
                  return (
                    <div key={day.toISOString()} className={`flex min-h-[68px] flex-col items-center justify-center rounded-md ${isToday ? 'bg-ink text-white' : 'bg-canvas text-ink'}`}>
                      <span className={`text-[13px] font-semibold ${isToday ? 'text-white' : 'text-ink-2'}`}>{format(day, 'EEEEE')}</span>
                      <span className="mt-1 text-base font-bold tabular-nums">{format(day, 'd')}</span>
                      <span aria-label={hasRegistration ? 'Registered' : undefined} className={`mt-1 h-1.5 w-1.5 rounded-full ${hasRegistration ? 'bg-lime' : 'bg-transparent'}`} />
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                <Link href="/wod" className="inline-flex min-h-11 items-center rounded-sm border border-line px-3 text-sm font-bold text-ink hover:bg-canvas">Today&apos;s WOD</Link>
                <Link href="/calendar" className="inline-flex min-h-11 items-center rounded-sm border border-line px-3 text-sm font-bold text-ink hover:bg-canvas">Calendar</Link>
              </div>
            </Card>
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="font-display text-[30px] font-extrabold uppercase text-ink">Next 7 days</h2>
              <Link href="/calendar" className="whitespace-nowrap text-sm font-bold text-ink underline decoration-line underline-offset-4 hover:decoration-ink">Full calendar →</Link>
            </div>

            {nextSeven.length === 0 ? (
              <Card className="p-5">
                <p className="text-base text-ink-2">No workouts in the next 7 days.</p>
              </Card>
            ) : (
              <Card className="!p-0 divide-y divide-line-2">
                {nextSeven.map((workout) => {
                  const date = new Date(workout.date);
                  const full = workout.registered_count >= workout.max_participants;
                  const status = workout.is_registered ? 'registered' : full ? 'full' : 'open';
                  const pending = registering === workout.id;
                  return (
                    <div key={workout.id} className="grid grid-cols-[40px_minmax(0,1fr)_20px] items-center gap-3 px-3 py-4 first:rounded-t-lg last:rounded-b-lg md:grid-cols-[56px_68px_minmax(0,1fr)_auto_auto] md:gap-4 md:px-5">
                      <div className="flex flex-col items-center">
                        <span className="text-[13px] font-bold uppercase text-ink-2">{format(date, 'EEE')}</span>
                        <span className="mt-0.5 font-display text-[30px] font-bold leading-none tabular-nums text-ink">{format(date, 'd')}</span>
                      </div>
                      <time className="hidden whitespace-nowrap text-sm font-bold tabular-nums text-ink md:block">{format(date, 'HH:mm')}</time>
                      <Link href={`/workouts/${workout.id}`} className="min-w-0 group">
                        <span className="block truncate font-semibold text-ink group-hover:underline">{workout.title}</span>
                        <span className="mt-1 block truncate text-[13px] text-ink-2 md:text-sm">
                          <span className="md:hidden">{format(date, 'HH:mm')} · {workout.registered_count}/{workout.max_participants} · </span>
                          {workout.description || 'Workout details'}
                        </span>
                      </Link>
                      <CapacityBar value={workout.registered_count} max={workout.max_participants} className="hidden md:inline-flex" />
                      <StatusAction
                        status={status}
                        disabled={pending || (full && !workout.is_registered)}
                        onJoin={() => handleRegister(workout.id, false)}
                        onUnregister={() => handleRegister(workout.id, true)}
                        className="hidden md:inline-flex"
                      />
                      <button
                        type="button"
                        disabled={pending || (full && !workout.is_registered)}
                        onClick={() => handleRegister(workout.id, workout.is_registered)}
                        aria-label={workout.is_registered ? `Unregister from ${workout.title}` : full ? `${workout.title} is full` : `Join ${workout.title}`}
                        className={`h-3.5 w-3.5 rounded-full border focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/20 disabled:cursor-not-allowed md:hidden ${
                          workout.is_registered ? 'border-lime bg-lime' : full ? 'border-line bg-line' : 'border-ink bg-white'
                        }`}
                      />
                    </div>
                  );
                })}
              </Card>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
