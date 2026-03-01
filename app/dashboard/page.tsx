'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { Card, Loading } from '@/components/ui';
import { format } from 'date-fns';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [allUpcomingWorkouts, setAllUpcomingWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Check authentication
      const sessionResponse = await fetch('/api/auth/session');
      if (!sessionResponse.ok) {
        router.push('/login');
        return;
      }
      const sessionData = await sessionResponse.json();
      setUser(sessionData.user);

      // Fetch stats
      const statsResponse = await fetch('/api/user/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // Fetch upcoming workouts (full list for weekly overview + first 5 for list)
      const workoutsResponse = await fetch('/api/workouts?filter=upcoming');
      if (workoutsResponse.ok) {
        const workoutsData = await workoutsResponse.json();
        setAllUpcomingWorkouts(workoutsData.workouts || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  // Next 7 days (today through today+6), grouped by day; only days with at least one workout
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const next7End = new Date(todayStart);
  next7End.setDate(next7End.getDate() + 7);
  next7End.setHours(23, 59, 59, 999);
  const next7Workouts = allUpcomingWorkouts.filter((w: any) => {
    const d = new Date(w.date);
    return d >= todayStart && d <= next7End;
  });
  const workoutsByDay = next7Workouts.reduce<Record<string, any[]>>((acc, w) => {
    const key = format(new Date(w.date), 'yyyy-MM-dd');
    if (!acc[key]) acc[key] = [];
    acc[key].push(w);
    return acc;
  }, {});
  const orderedDayKeys = Object.keys(workoutsByDay).sort();
  const upcomingWorkouts = allUpcomingWorkouts.slice(0, 5);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-dark py-8 relative">
        {/* Watermark Logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <Image 
            src="/go-pure-logo.png" 
            alt="" 
            width={800} 
            height={800}
            className="opacity-[0.07] select-none"
            style={{ filter: 'grayscale(100%)' }}
          />
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <h1 className="text-4xl font-bold mb-8 text-pure-white">
            Welcome back, {user?.name}!
          </h1>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-coastal-sky to-coastal-search text-white border-coastal-sky">
              <h3 className="text-sm font-medium opacity-90">Total Workouts</h3>
              <p className="text-4xl font-bold mt-2">{stats?.total_workouts || 0}</p>
            </Card>

            <Card className="bg-gradient-to-br from-coastal-search to-coastal-day text-white border-coastal-day">
              <h3 className="text-sm font-medium opacity-90">Attended</h3>
              <p className="text-4xl font-bold mt-2">{stats?.attended_workouts || 0}</p>
            </Card>

            <Card className="bg-gradient-to-br from-coastal-day to-coastal-kombucha text-gray-900 border-coastal-kombucha">
              <h3 className="text-sm font-medium opacity-90">Upcoming</h3>
              <p className="text-4xl font-bold mt-2">{stats?.upcoming_workouts || 0}</p>
            </Card>

            <Card className="bg-gradient-to-br from-coastal-kombucha to-coastal-honey text-gray-900 border-coastal-honey">
              <h3 className="text-sm font-medium opacity-90">Current Streak</h3>
              <p className="text-4xl font-bold mt-2">{stats?.current_streak || 0}</p>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Link href="/wod">
              <Card className="hover:shadow-xl transition-all cursor-pointer border-2 border-coastal-search hover:border-coastal-sky bg-pure-gray">
                <h3 className="text-xl font-bold text-pure-white mb-2">Today&apos;s workout</h3>
                <p className="text-gray-300">See today&apos;s scheduled workouts</p>
              </Card>
            </Link>

            <Link href="/archive">
              <Card className="hover:shadow-xl transition-all cursor-pointer border-2 border-coastal-search hover:border-coastal-honey bg-pure-gray">
                <h3 className="text-xl font-bold text-pure-white mb-2">Workout Archive</h3>
                <p className="text-gray-300">Browse your library of templates</p>
              </Card>
            </Link>
          </div>

          {/* Weekly Workout Overview (next 7 days, WOD-style) */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-pure-green mb-2">Weekly Workout Overview</h2>
            <p className="text-xl text-pure-text-light mb-4">Next 7 days</p>
            <div className="h-1 bg-gradient-to-r from-pure-green to-coastal-sky rounded-full mb-6" />

            {orderedDayKeys.length === 0 ? (
              <div className="bg-pure-gray border border-gray-700 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">💪</div>
                <h3 className="text-3xl font-bold text-pure-white mb-3">No workouts in the next 7 days</h3>
                <p className="text-xl text-pure-text-light">Check back later or create a workout!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {orderedDayKeys.map((dayKey) => {
                  const dayWorkouts = workoutsByDay[dayKey];
                  const dayDate = new Date(dayKey + 'T12:00:00');
                  return (
                    <div key={dayKey} className="space-y-3">
                      <div>
                        <h3 className="text-2xl font-bold text-pure-green">
                          {format(dayDate, 'EEEE, MMMM d, yyyy')}
                        </h3>
                      </div>
                      <div className="space-y-4">
                        {dayWorkouts.map((workout: any, index: number) => {
                          const workoutDate = new Date(workout.date);
                          const now = new Date();
                          return (
                            <Link key={workout.id} href={`/workouts/${workout.id}`}>
                              <div className="bg-pure-gray border border-gray-700 rounded-lg p-4 shadow-lg hover:border-coastal-sky transition">
                                <div className="flex items-center gap-4 mb-3 flex-nowrap min-w-0">
                                  <div className="text-2xl font-bold text-pure-green shrink-0">
                                    #{index + 1}
                                  </div>
                                  <div className="flex items-center gap-3 min-w-0 flex-1 flex-nowrap overflow-hidden">
                                    <span className="text-base font-medium px-3 py-1 bg-coastal-sky/20 text-coastal-sky border border-coastal-sky/50 rounded-lg shrink-0">
                                      {workout.workout_type}
                                    </span>
                                    <span className="text-lg font-bold text-pure-white shrink-0 whitespace-nowrap">
                                      {format(workoutDate, 'h:mm a')}
                                    </span>
                                    <h4 className="text-xl font-bold text-pure-white truncate min-w-0 shrink">
                                      {workout.title}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                                    <span className="text-sm text-pure-text-light">Participants</span>
                                    <span className="text-xl font-bold text-pure-green">
                                      {workout.registered_count}/{workout.max_participants}
                                    </span>
                                  </div>
                                </div>
                                {workout.description && (
                                  <div className="mt-3 bg-pure-dark border border-gray-700 rounded-lg p-3">
                                    <h4 className="text-sm font-bold text-pure-white mb-1">Description</h4>
                                    <p className="text-sm text-pure-text-light whitespace-pre-wrap line-clamp-4">
                                      {workout.description}
                                    </p>
                                  </div>
                                )}
                                <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
                                  <p className="text-sm text-pure-text-light">
                                    Created by <span className="font-semibold text-pure-white">{workout.creator_name}</span>
                                  </p>
                                  {workoutDate < now ? (
                                    <span className="text-sm font-medium px-2 py-0.5 bg-gray-700 text-gray-400 rounded">
                                      Completed
                                    </span>
                                  ) : (
                                    <span className="text-sm font-medium px-2 py-0.5 bg-green-900 text-green-200 rounded">
                                      Upcoming
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Registered Workouts */}
          <Card className="bg-pure-gray border-coastal-search">
            <h2 className="text-2xl font-bold mb-4 text-pure-white">Upcoming Workouts</h2>
            
            {upcomingWorkouts.length === 0 ? (
              <p className="text-gray-300">No upcoming workouts scheduled yet.</p>
            ) : (
              <div className="space-y-4">
                {upcomingWorkouts.map((workout) => (
                  <Link key={workout.id} href={`/workouts/${workout.id}`}>
                    <div className="border border-coastal-search rounded-lg p-4 hover:bg-gray-800 hover:border-coastal-sky transition cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-pure-white">{workout.title}</h3>
                            {workout.is_registered && (
                              <span className="text-xs font-medium px-2 py-1 bg-coastal-day/20 text-coastal-day rounded border border-coastal-day">
                                Registered
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-1">{workout.workout_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-coastal-honey">
                            {format(new Date(workout.date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(workout.date), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-400">
                        {workout.registered_count}/{workout.max_participants} registered
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
