'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import PhotoHero from '@/components/PhotoHero';
import { Avatar, CapacityBar, Card, Label, Loading, StatusAction } from '@/components/ui';
import WorkoutFormatStamps from '@/components/WorkoutFormatStamps';
import { addDays, format, startOfWeek } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import type { Announcement, WorkoutWithDetails } from '@/lib/types';
import { getDashboardStats } from '@/lib/dashboard-stats';
import { parseWorkoutDescription } from '@/lib/workout-description';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name: string) {
  const words = name
    .replace(/\p{Extended_Pictographic}|\p{Regional_Indicator}/gu, '')
    .match(/[\p{L}\p{N}]+/gu) || [];
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || '?';
}

function formatCountdown(minutes: number) {
  if (minutes < 60) return `${minutes} MIN`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}H ${remainingMinutes}M` : `${hours}H`;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [clock, setClock] = useState(() => new Date());
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [registering, setRegistering] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch('/api/workouts').then(async (response) => {
        if (!response.ok) throw new Error('Could not load workouts');
        return response.json();
      }),
      fetch('/api/announcements').then(async (response) => {
        if (!response.ok) throw new Error('Could not load announcements');
        return response.json();
      }),
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

  const handleCastToTv = async (workoutId: number) => {
    const boardUrl = new URL(`/workouts/${workoutId}/board?tv=1`, window.location.origin).toString();
    type PresentationRequestLike = { start: () => Promise<unknown> };
    type PresentationRequestFactory = new (urls: string[]) => PresentationRequestLike;
    const PresentationRequest = (window as Window & {
      PresentationRequest?: PresentationRequestFactory;
    }).PresentationRequest;

    if (PresentationRequest) {
      try {
        await new PresentationRequest([boardUrl]).start();
        return;
      } catch (error) {
        console.warn('Could not start TV presentation:', error);
      }
    }

    window.open(boardUrl, '_blank', 'noopener,noreferrer');
    setToast('Use AirPlay / Screen Mirroring to send this window to the TV');
    window.setTimeout(() => setToast(''), 5000);
  };

  const now = clock;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);
  const nextSevenEnd = addDays(today, 7);
  const sortedWorkouts = [...workouts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const activeWorkout = sortedWorkouts.find((workout) => {
    const start = new Date(workout.date).getTime();
    return start <= now.getTime() && now.getTime() < start + 60 * 60_000;
  });
  const nextWorkout = activeWorkout ?? sortedWorkouts.find(
    (workout) => new Date(workout.date) > now
  ) ?? null;
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
  const dashboardStats = useMemo(
    () => user ? getDashboardStats(workouts, user.id, now) : null,
    [workouts, user, now]
  );

  if (loading || dataLoading) return <Loading />;

  const firstName = user?.name.split(/\s+/)[0] || 'there';
  const announcement = announcements[0];
  const greeting = getGreeting();
  const heroParts = nextWorkout?.description ? parseWorkoutDescription(nextWorkout.description).slice(0, 3) : [];

  return (
    <>
      <Navbar photoHero />
      <main className="min-h-screen bg-canvas pb-6 md:pb-10">
        <PhotoHero
          image="/images/gym-hero.jpg"
          mobileImage="/images/gym-rig.jpg"
          imageAlt="PURE gym training rig and kettlebells"
          objectPosition="center 52%"
          mobileObjectPosition="center 48%"
          className="h-[330px] md:h-[440px]"
        >
          <header className="mx-auto flex h-full max-w-[1120px] flex-col justify-between px-4 pb-8 pt-[68px] md:pb-[108px] md:pt-10">
            <div className="flex items-start justify-between gap-4">
              <Label className="text-lime">{format(now, "EEEE '·' d MMMM").toUpperCase()}</Label>
              {announcement && (
                <div className="max-w-[48%] rounded-lg border border-white/80 bg-white/[.96] px-4 py-3 text-ink shadow-card md:max-w-sm">
                  <span className="block text-[13px] font-bold uppercase tracking-wide">News</span>
                  <span className="mt-1 block truncate text-sm font-semibold">{announcement.title}</span>
                </div>
              )}
            </div>
            <div className="max-w-[900px]">
              <h1 className="font-display text-[58px] font-black leading-[.82] tracking-[-.01em] text-white md:text-[112px]" style={{ textTransform: 'none' }}>
                <span className="block">{greeting},</span>
                <span className="block">{firstName}.</span>
              </h1>
              <p className="mt-3 text-base text-white">You&apos;re in for <strong className="font-bold text-lime">{registeredThisWeek} sessions</strong> this week.</p>
            </div>
          </header>
        </PhotoHero>

        <section className="relative z-20 mx-auto -mt-11 grid max-w-[1120px] gap-5 px-4 md:-mt-[88px] md:grid-cols-[1.55fr_1fr]">
            {nextWorkout && (() => {
              const date = new Date(nextWorkout.date);
              const isOnNow = nextWorkout.id === activeWorkout?.id;
              const countdownMinutes = Math.max(0, Math.ceil(
                ((isOnNow ? date.getTime() + 60 * 60_000 : date.getTime()) - now.getTime()) / 60_000
              ));
              const full = nextWorkout.registered_count >= nextWorkout.max_participants;
              const participants = [...nextWorkout.participants].sort((a, b) =>
                Number(b.user_id === user?.id) - Number(a.user_id === user?.id)
              );
              const dateLabel = date.toDateString() === addDays(today, 1).toDateString()
                ? `Tomorrow · ${format(date, 'EEE d MMM')}`
                : format(date, 'EEE d MMM');
              const status = nextWorkout.is_registered
                ? 'YOU’RE IN'
                : full
                  ? `FULL · ${nextWorkout.registered_count}/${nextWorkout.max_participants}`
                  : `OPEN · ${nextWorkout.registered_count}/${nextWorkout.max_participants}`;

              return (
                <article className="rounded-xl bg-ink p-5 text-white md:p-[30px]" style={{ boxShadow: '0 24px 60px rgba(0,0,0,.25)' }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-lime px-3 py-1 text-[13px] font-bold uppercase tracking-wide text-ink">{isOnNow ? 'On now' : 'Up next'}</span>
                      <span className="text-sm font-semibold text-white">{dateLabel}</span>
                    </div>
                    <span className="rounded-full border border-white/20 px-3 py-1 text-[13px] font-bold text-white">{status}</span>
                  </div>

                  <div className="mt-7">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <time className="block font-display text-[72px] font-extrabold leading-[.82] tabular-nums text-lime md:text-[120px]">
                        {format(date, 'HH:mm')}
                      </time>
                      <span className="pb-1 text-sm font-bold uppercase tracking-wide text-white md:text-base">
                        {isOnNow ? `Ends in ${formatCountdown(countdownMinutes)}` : `Starts in ${formatCountdown(countdownMinutes)}`}
                      </span>
                    </div>
                    <Link href={`/workouts/${nextWorkout.id}`} className="mt-4 block max-w-4xl text-white hover:text-lime focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-lime/40">
                      <h2 className="line-clamp-2 font-display text-[36px] font-black uppercase leading-[.9] md:text-[52px]">{nextWorkout.title}</h2>
                    </Link>
                    <WorkoutFormatStamps title={nextWorkout.title} description={nextWorkout.description || ''} tone="dark" />
                  </div>

                  {heroParts.length > 0 ? (
                    <div className="mt-7 hidden grid-cols-1 gap-2 sm:grid sm:grid-cols-3">
                      {heroParts.map((part, index) => (
                        <div key={`${part.title}-${index}`} className="min-h-32 rounded-lg border border-[#2A2C27] bg-[#141512] p-3">
                          <p className="text-[13px] font-bold uppercase tracking-wide text-white">
                            {String(index + 1).padStart(2, '0')} · {part.sectionTitle}{part.durationMinutes ? ` · ${part.durationMinutes}′` : ''}
                          </p>
                          {part.title !== part.sectionTitle && (
                            <p className="mt-2 line-clamp-2 font-display text-xl font-bold leading-tight text-white">{part.title}</p>
                          )}
                          <div className="mt-2 space-y-1 text-sm leading-snug text-white">
                            {part.movements.length ? part.movements.slice(0, 5).map((movement, movementIndex) => (
                              <p key={`${movement.movement}-${movementIndex}`} className="line-clamp-1">
                                {movement.reps ? `${movement.reps} ` : ''}{movement.movement}
                              </p>
                            )) : part.lines.slice(0, 3).map((line, lineIndex) => (
                              <p key={`${line}-${lineIndex}`} className="line-clamp-1">{line}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/15 pt-5">
                    <div className="hidden min-w-0 items-center sm:flex">
                      <div className="flex -space-x-2">
                        {participants.slice(0, 4).map((participant) => (
                          <Avatar
                            key={participant.user_id}
                            initials={getInitials(participant.user_name)}
                            className={`h-9 w-9 border-2 border-ink text-[13px] ${participant.user_id === user?.id ? '!bg-lime !text-ink' : '!bg-ink !text-white'}`}
                          />
                        ))}
                      </div>
                      <span className="ml-3 truncate text-sm text-white">
                        {participants.slice(0, 3).map((participant) => (
                          participant.user_id === user?.id ? 'You' : participant.user_name.split(' ')[0]
                        )).join(', ')}
                        {participants.length > 3 ? ` +${participants.length - 3}` : ''}
                      </span>
                    </div>
                    <div className="sm:hidden">
                      <CapacityBar value={nextWorkout.registered_count} max={nextWorkout.max_participants} className="[&>span:last-child]:text-white [&>span>span]:bg-white" />
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link href={`/workouts/${nextWorkout.id}/board`} className="inline-flex min-h-11 items-center rounded-sm bg-lime px-4 text-sm font-bold text-ink hover:brightness-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/50">
                        Open board →
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleCastToTv(nextWorkout.id)}
                        className="inline-flex min-h-11 items-center rounded-sm border border-white/50 px-4 text-sm font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-lime/40"
                      >
                        Cast to TV
                      </button>
                    </div>
                  </div>
                </article>
              );
            })()}

            <Card className="flex flex-col !p-5 shadow-[0_24px_60px_rgba(0,0,0,.25)] md:!p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label>Your stats</Label>
                  <p className="mt-2 text-sm font-medium text-ink-2">Training consistency · 12 weeks</p>
                </div>
                <div className="relative h-[92px] w-[92px] shrink-0" role="img" aria-label={`Attendance · 12 weeks: ${dashboardStats?.attendanceRate ?? 0}%`}>
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="var(--lime)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(dashboardStats?.attendanceRate ?? 0) * 2.639} 263.9`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-display text-2xl font-extrabold tabular-nums text-ink">
                    {dashboardStats?.attendanceRate ?? 0}%
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3 border-b border-line-2 pb-4">
                <div>
                  <p className="font-display text-5xl font-black leading-[.82] tracking-[-.01em] tabular-nums text-ink md:text-[96px]">
                    {dashboardStats?.streakWeeks ?? 0}
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-ink-2">week streak</p>
                </div>
                <p className="text-right text-[13px] font-semibold text-ink-2">
                  ATTENDANCE · 12 WKS
                  <span className="mt-1 block text-base font-bold tabular-nums text-ink">
                    {dashboardStats?.attended ?? 0}/{dashboardStats?.registered ?? 0} sessions
                  </span>
                </p>
              </div>

              <div className="mt-4 grid grid-cols-12 gap-1.5" role="list" aria-label="Attendance by week for the last 12 weeks">
                {dashboardStats?.weeks.map((week) => {
                  const intensity = week.registered === 0
                    ? 'bg-line'
                    : week.attended === 0
                      ? 'bg-[#D8DAD2]'
                      : week.attended >= 2
                        ? 'bg-lime'
                        : 'bg-[#B5D34A]';
                  return (
                    <span
                      key={week.key}
                      role="listitem"
                      title={`${week.label}: ${week.attended} attended of ${week.registered} registered`}
                      aria-label={`${week.label}: ${week.attended} attended of ${week.registered} registered`}
                      className={`h-3 rounded-sm ${intensity}`}
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[13px] font-medium text-ink-2">
                <span>{dashboardStats?.weeks[0]?.label}</span>
                <span>This week</span>
              </div>

              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                <Link href="/wod" className="inline-flex min-h-11 items-center rounded-sm border border-line px-3 text-sm font-bold text-ink hover:bg-canvas">Today&apos;s WOD</Link>
                <Link href="/calendar" className="inline-flex min-h-11 items-center rounded-sm border border-line px-3 text-sm font-bold text-ink hover:bg-canvas">Calendar</Link>
              </div>
            </Card>
        </section>

        <section className="mx-auto mt-8 max-w-[1120px] px-4">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="font-display text-[40px] font-black uppercase leading-[.9] tracking-[-.01em] text-ink">Next 7 days</h2>
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
                    <div key={workout.id} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-4 first:rounded-t-lg last:rounded-b-lg md:grid-cols-[56px_68px_minmax(0,1fr)_auto_auto] md:gap-4 md:px-5">
                      <div className="flex flex-col items-center">
                        <span className="text-[13px] font-bold uppercase text-ink-2">{format(date, 'EEE')}</span>
                        <span className="mt-0.5 font-display text-[34px] font-black leading-none tracking-[-.01em] tabular-nums text-ink">{format(date, 'd')}</span>
                      </div>
                      <time className="hidden whitespace-nowrap text-sm font-bold tabular-nums text-ink md:block">{format(date, 'HH:mm')}</time>
                      <Link href={`/workouts/${workout.id}`} className="min-w-0 group">
                        <span className="block truncate font-semibold text-ink group-hover:underline">{workout.title}</span>
                        <WorkoutFormatStamps title={workout.title} description={workout.description || ''} />
                        <span className="mt-1 block text-[13px] text-ink-2 md:hidden">
                          {format(date, 'HH:mm')}
                        </span>
                      </Link>
                      <CapacityBar value={workout.registered_count} max={workout.max_participants} className="hidden md:inline-flex" />
                      <div className="flex items-center gap-2">
                        <Link href={`/workouts/${workout.id}/board`} className="inline-flex min-h-11 items-center rounded-sm border border-line bg-paper px-3 text-[13px] font-bold text-ink hover:bg-canvas">
                          Board
                        </Link>
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
                          className={`h-3.5 w-3.5 shrink-0 rounded-full border focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/20 disabled:cursor-not-allowed md:hidden ${
                            workout.is_registered ? 'border-lime bg-lime' : full ? 'border-line bg-line' : 'border-ink bg-white'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </Card>
            )}
        </section>
      </main>
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-50 w-[min(92vw,34rem)] -translate-x-1/2 rounded-lg bg-ink px-5 py-4 text-center text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
