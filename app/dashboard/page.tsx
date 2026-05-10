'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { Loading } from '@/components/ui';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { getWorkoutTypeStyle } from '@/lib/workout-colors';
import { motion } from 'framer-motion';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  initial: {},
  animate: { transition: { staggerChildren: 0.07 } },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [registering, setRegistering] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch('/api/workouts?filter=upcoming').then((r) => r.json()),
      fetch('/api/announcements').then((r) => r.json()),
    ])
      .then(([wData, aData]) => {
        setWorkouts(wData.workouts || []);
        setAnnouncements(aData.announcements || []);
      })
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [user]);

  const handleRegister = async (workoutId: number, isRegistered: boolean) => {
    setRegistering(workoutId);
    try {
      await fetch(`/api/workouts/${workoutId}/register`, {
        method: isRegistered ? 'DELETE' : 'POST',
      });
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === workoutId
            ? { ...w, is_registered: !isRegistered, registered_count: isRegistered ? w.registered_count - 1 : w.registered_count + 1 }
            : w
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setRegistering(null);
    }
  };

  if (loading || dataLoading) return <Loading />;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next7End = new Date(todayStart);
  next7End.setDate(next7End.getDate() + 7);
  next7End.setHours(23, 59, 59, 999);

  const next7 = workouts.filter((w: any) => {
    const d = new Date(w.date);
    return d >= todayStart && d <= next7End;
  });

  const nextWorkout = workouts
    .filter((w: any) => new Date(w.date) > now)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;

  const workoutsByDay = next7.reduce<Record<string, any[]>>((acc, w) => {
    const key = format(new Date(w.date), 'yyyy-MM-dd');
    if (!acc[key]) acc[key] = [];
    acc[key].push(w);
    return acc;
  }, {});
  const orderedDayKeys = Object.keys(workoutsByDay).sort();

  const registeredThisWeek = next7.filter((w: any) => w.is_registered).length;
  const initials = getInitials(user?.name);
  const greeting = getGreeting();
  const tagline = registeredThisWeek > 0
    ? `You're registered for ${registeredThisWeek} workout${registeredThisWeek > 1 ? 's' : ''} this week.`
    : 'No workouts scheduled yet this week — time to sign up!';

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-dark py-8 relative overflow-hidden">
        {/* Background watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <Image src="/go-pure-logo.png" alt="" width={800} height={800} className="opacity-[0.04] select-none" style={{ filter: 'grayscale(100%)' }} />
        </div>

        <div className="container mx-auto px-4 max-w-6xl relative z-10 space-y-8">

          {/* Greeting */}
          <motion.div
            variants={fadeUp} initial="initial" animate="animate"
            transition={{ duration: 0.4 }}
            className="flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pure-green to-coastal-sky flex items-center justify-center text-pure-dark font-bold text-xl shrink-0 shadow-lg shadow-pure-green/20 select-none">
              {initials}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-pure-white">
                {greeting}, {user?.name}!
              </h1>
              <p className="text-pure-text-light mt-0.5">{tagline}</p>
            </div>
          </motion.div>

          {/* Announcements */}
          {announcements.length > 0 && (
            <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
              {announcements.map((a: any) => (
                <motion.div
                  key={a.id}
                  variants={fadeUp}
                  transition={{ duration: 0.35 }}
                  className="flex gap-3 items-start bg-coastal-sky/10 border border-coastal-sky/40 rounded-xl px-4 py-3"
                >
                  <span className="text-coastal-sky mt-0.5 shrink-0 text-lg">📌</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-pure-white text-sm">{a.title}</p>
                    {a.body && <p className="text-pure-text-light text-sm mt-0.5">{a.body}</p>}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Quick stats — glassmorphism */}
          <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              { href: '/wod',      from: 'from-coastal-sky/25',    to: 'to-coastal-search/15',   border: 'border-coastal-sky/25',       shadow: 'shadow-coastal-sky/10',       label: 'Workout of the Day', primary: 'View WOD',                   sub: null },
              { href: null,        from: 'from-coastal-search/25', to: 'to-coastal-day/15',      border: 'border-coastal-day/25',       shadow: 'shadow-coastal-day/10',       label: 'This Week',          primary: String(registeredThisWeek),  sub: "workouts you're registered for" },
              { href: '/calendar', from: 'from-coastal-day/25',    to: 'to-coastal-kombucha/15', border: 'border-coastal-kombucha/25',  shadow: 'shadow-coastal-kombucha/10',  label: 'Calendar',           primary: 'Open calendar',              sub: null },
            ] as const).map(({ href, from, to, border, shadow, label, primary, sub }) => {
              const card = (
                <motion.div
                  variants={fadeUp}
                  transition={{ duration: 0.35 }}
                  className={`rounded-xl p-5 bg-gradient-to-br ${from} ${to} backdrop-blur-sm border ${border} shadow-lg ${shadow} ${href ? 'hover:scale-[1.02] active:scale-[0.99] transition-transform cursor-pointer' : ''}`}
                >
                  <h3 className="text-sm font-medium text-pure-text-light">{label}</h3>
                  <p className={`font-bold mt-2 text-pure-white ${sub ? 'text-4xl' : 'text-2xl'}`}>{primary}</p>
                  {sub && <p className="text-sm text-pure-text-light mt-1">{sub}</p>}
                </motion.div>
              );
              return href
                ? <Link key={label} href={href}>{card}</Link>
                : <div key={label}>{card}</div>;
            })}
          </motion.div>

          {/* Featured next workout */}
          {nextWorkout && (() => {
            const typeStyle = getWorkoutTypeStyle(nextWorkout.workout_type);
            const isFull = nextWorkout.registered_count >= nextWorkout.max_participants && !nextWorkout.is_registered;
            const isLoading = registering === nextWorkout.id;
            const workoutDate = new Date(nextWorkout.date);
            return (
              <motion.div
                variants={fadeUp} initial="initial" animate="animate"
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <p className="text-xs font-bold tracking-widest text-pure-text-light uppercase mb-3">Up Next</p>
                <div className={`relative bg-pure-gray rounded-xl overflow-hidden shadow-xl border ${nextWorkout.is_registered ? 'border-pure-green/40' : 'border-gray-700'}`}>
                  <div className="h-1 w-full bg-gradient-to-r from-pure-green via-coastal-sky to-coastal-day" />
                  <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${typeStyle.badge}`}>
                          {nextWorkout.workout_type}
                        </span>
                        <span className="text-sm text-pure-text-light">
                          {format(workoutDate, 'EEEE, MMM d · h:mm a')}
                        </span>
                        {nextWorkout.is_registered && (
                          <span className="text-xs px-2 py-0.5 rounded bg-pure-green/20 text-pure-green border border-pure-green/40">Registered</span>
                        )}
                      </div>
                      <Link href={`/workouts/${nextWorkout.id}`}>
                        <h2 className="text-2xl md:text-3xl font-bold text-pure-white hover:text-coastal-sky transition leading-snug mb-2">
                          {nextWorkout.title}
                        </h2>
                      </Link>
                      {nextWorkout.description && (
                        <p className="text-sm text-pure-text-light line-clamp-3 leading-relaxed">{nextWorkout.description}</p>
                      )}
                    </div>
                    <div className="flex md:flex-col items-center md:items-end gap-3 shrink-0">
                      <div className="text-center md:text-right">
                        <span className={`text-2xl font-bold ${nextWorkout.registered_count >= nextWorkout.max_participants ? 'text-red-400' : 'text-pure-green'}`}>
                          {nextWorkout.registered_count}/{nextWorkout.max_participants}
                        </span>
                        <p className="text-xs text-pure-text-light">spots</p>
                      </div>
                      <button
                        onClick={() => handleRegister(nextWorkout.id, nextWorkout.is_registered)}
                        disabled={isLoading || isFull}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition disabled:opacity-50 whitespace-nowrap ${
                          nextWorkout.is_registered
                            ? 'bg-red-600/20 text-red-300 border border-red-600/40 hover:bg-red-600/30'
                            : isFull
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-pure-green text-pure-dark hover:bg-pure-accent-light shadow-md shadow-pure-green/25'
                        }`}
                      >
                        {isLoading ? '…' : nextWorkout.is_registered ? 'Unregister' : isFull ? 'Full' : '+ Register'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* Next 7 days */}
          <div>
            <motion.div
              variants={fadeUp} initial="initial" animate="animate"
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <h2 className="text-3xl font-bold text-pure-green mb-1">Next 7 Days</h2>
              <div className="h-1 bg-gradient-to-r from-pure-green to-coastal-sky rounded-full mb-6" />
            </motion.div>

            {orderedDayKeys.length === 0 ? (
              <motion.div
                variants={fadeUp} initial="initial" animate="animate"
                transition={{ duration: 0.4, delay: 0.3 }}
                className="bg-pure-gray border border-gray-700 rounded-xl p-12 text-center"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-pure-green/10 border border-pure-green/20 flex items-center justify-center">
                  <span className="text-4xl">💪</span>
                </div>
                <h3 className="text-2xl font-bold text-pure-white mb-2">Rest week!</h3>
                <p className="text-pure-text-light">No workouts in the next 7 days. Check back soon or create one!</p>
              </motion.div>
            ) : (
              <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
                {orderedDayKeys.map((dayKey) => {
                  const dayWorkouts = workoutsByDay[dayKey];
                  const dayDate = new Date(dayKey + 'T12:00:00');
                  return (
                    <motion.div
                      key={dayKey}
                      variants={fadeUp}
                      transition={{ duration: 0.35 }}
                      className="space-y-3"
                    >
                      <h3 className="text-xl font-bold text-pure-green">
                        {format(dayDate, 'EEEE, MMMM d')}
                      </h3>
                      <div className="space-y-3">
                        {dayWorkouts.map((workout: any) => {
                          const workoutDate = new Date(workout.date);
                          const isFull = workout.registered_count >= workout.max_participants && !workout.is_registered;
                          const typeStyle = getWorkoutTypeStyle(workout.workout_type);
                          const isLoading = registering === workout.id;

                          return (
                            <div
                              key={workout.id}
                              className={`relative group/card rounded-xl p-4 border border-gray-700 border-l-4 transition-all ${typeStyle.leftBorder} ${
                                workout.is_registered
                                  ? 'border-t-pure-green/30 border-r-pure-green/30 border-b-pure-green/30 shadow-sm shadow-pure-green/5'
                                  : isFull
                                  ? 'opacity-50'
                                  : 'hover:border-t-gray-600 hover:border-r-gray-600 hover:border-b-gray-600'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Left: type + time + title */}
                                <Link href={`/workouts/${workout.id}`} className="flex-1 min-w-0 group">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${typeStyle.badge}`}>
                                      {workout.workout_type}
                                    </span>
                                    <span className="text-sm font-semibold text-pure-white">
                                      {format(workoutDate, 'h:mm a')}
                                    </span>
                                    {workout.is_registered && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-pure-green/20 text-pure-green border border-pure-green/40">
                                        Registered
                                      </span>
                                    )}
                                    {isFull && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700">
                                        Full
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-lg font-bold text-pure-white group-hover:text-coastal-sky transition leading-snug">
                                    {workout.title}
                                  </h4>
                                  {workout.description && (
                                    <p className="text-sm text-pure-text-light mt-1 line-clamp-2">{workout.description}</p>
                                  )}
                                </Link>

                                {/* Right: spots + register button */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                  <div className="text-right">
                                    <span className={`text-lg font-bold ${workout.registered_count >= workout.max_participants ? 'text-red-400' : 'text-pure-green'}`}>
                                      {workout.registered_count}/{workout.max_participants}
                                    </span>
                                    <p className="text-xs text-pure-text-light">spots</p>
                                  </div>
                                  <button
                                    onClick={() => handleRegister(workout.id, workout.is_registered)}
                                    disabled={isLoading || isFull}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition whitespace-nowrap disabled:opacity-50 ${
                                      workout.is_registered
                                        ? 'bg-red-600/20 text-red-300 border border-red-600/40 hover:bg-red-600/30'
                                        : isFull
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : 'bg-pure-green/20 text-pure-green border border-pure-green/40 hover:bg-pure-green/30'
                                    }`}
                                  >
                                    {isLoading ? '…' : workout.is_registered ? 'Unregister' : isFull ? 'Full' : '+ Register'}
                                  </button>
                                </div>
                              </div>

                              {/* Hover popover — desktop only */}
                              <div className="hidden md:block pointer-events-none absolute left-full top-0 ml-3 z-50 w-72 opacity-0 group-hover/card:opacity-100 transition-opacity duration-150">
                                <div className="bg-[#1a1a1a] border border-gray-600 rounded-xl shadow-2xl p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${typeStyle.badge}`}>
                                      {workout.workout_type}
                                    </span>
                                    <span className="text-xs text-pure-text-light">{format(workoutDate, 'EEEE, MMM d · h:mm a')}</span>
                                  </div>
                                  <h4 className="text-base font-bold text-pure-white mb-2 leading-snug">{workout.title}</h4>
                                  {workout.description ? (
                                    <p className="text-sm text-pure-text-light mb-3 leading-relaxed">{workout.description}</p>
                                  ) : (
                                    <p className="text-sm text-gray-600 mb-3 italic">No description</p>
                                  )}
                                  <div className="border-t border-gray-700 pt-3 flex justify-between items-center text-xs text-pure-text-light">
                                    <span>by {workout.creator_name}</span>
                                    <span className={workout.registered_count >= workout.max_participants ? 'text-red-400 font-semibold' : 'text-pure-green font-semibold'}>
                                      {workout.registered_count}/{workout.max_participants} spots
                                    </span>
                                  </div>
                                </div>
                                <div className="absolute top-4 -left-1.5 w-3 h-3 bg-[#1a1a1a] border-l border-b border-gray-600 rotate-45" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
