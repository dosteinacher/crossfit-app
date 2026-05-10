'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { Card, Loading } from '@/components/ui';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { getWorkoutTypeStyle } from '@/lib/workout-colors';

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
            ? {
                ...w,
                is_registered: !isRegistered,
                registered_count: isRegistered ? w.registered_count - 1 : w.registered_count + 1,
              }
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

  const workoutsByDay = next7.reduce<Record<string, any[]>>((acc, w) => {
    const key = format(new Date(w.date), 'yyyy-MM-dd');
    if (!acc[key]) acc[key] = [];
    acc[key].push(w);
    return acc;
  }, {});
  const orderedDayKeys = Object.keys(workoutsByDay).sort();

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-dark py-8 relative">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <Image src="/go-pure-logo.png" alt="" width={800} height={800} className="opacity-[0.07] select-none" style={{ filter: 'grayscale(100%)' }} />
        </div>

        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <h1 className="text-4xl font-bold mb-6 text-pure-white">
            Welcome back, {user?.name}!
          </h1>

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="mb-6 space-y-3">
              {announcements.map((a: any) => (
                <div key={a.id} className="flex gap-3 items-start bg-coastal-sky/10 border border-coastal-sky/40 rounded-lg px-4 py-3">
                  <span className="text-coastal-sky mt-0.5 shrink-0 text-lg">📌</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-pure-white text-sm">{a.title}</p>
                    {a.body && <p className="text-pure-text-light text-sm mt-0.5">{a.body}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Link href="/wod">
              <Card className="h-full bg-gradient-to-br from-coastal-sky to-coastal-search text-white border-coastal-sky hover:shadow-xl transition-all cursor-pointer">
                <h3 className="text-sm font-medium opacity-90">Workout of the Day</h3>
                <p className="text-2xl font-bold mt-2">View WOD</p>
              </Card>
            </Link>
            <Card className="bg-gradient-to-br from-coastal-search to-coastal-day text-white border-coastal-day">
              <h3 className="text-sm font-medium opacity-90">This Week</h3>
              <p className="text-4xl font-bold mt-2">{next7.filter((w: any) => w.is_registered).length}</p>
              <p className="text-sm opacity-90 mt-1">workouts you&apos;re registered for</p>
            </Card>
            <Link href="/calendar">
              <Card className="h-full bg-gradient-to-br from-coastal-day to-coastal-kombucha text-gray-900 border-coastal-kombucha hover:shadow-xl transition-all cursor-pointer">
                <h3 className="text-sm font-medium opacity-90">Calendar</h3>
                <p className="text-2xl font-bold mt-2">Open calendar</p>
              </Card>
            </Link>
          </div>

          {/* Weekly overview */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-pure-green mb-1">Next 7 Days</h2>
            <div className="h-1 bg-gradient-to-r from-pure-green to-coastal-sky rounded-full mb-6" />

            {orderedDayKeys.length === 0 ? (
              <div className="bg-pure-gray border border-gray-700 rounded-lg p-8 text-center">
                <div className="text-5xl mb-3">💪</div>
                <h3 className="text-2xl font-bold text-pure-white mb-2">No workouts in the next 7 days</h3>
                <p className="text-pure-text-light">Check back later or create a workout!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {orderedDayKeys.map((dayKey) => {
                  const dayWorkouts = workoutsByDay[dayKey];
                  const dayDate = new Date(dayKey + 'T12:00:00');
                  return (
                    <div key={dayKey} className="space-y-3">
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
                            <div key={workout.id} className="bg-pure-gray border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition">
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
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
