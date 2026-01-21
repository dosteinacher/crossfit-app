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
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<any[]>([]);
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

      // Fetch upcoming workouts
      const workoutsResponse = await fetch('/api/workouts?filter=upcoming');
      if (workoutsResponse.ok) {
        const workoutsData = await workoutsResponse.json();
        // Show all upcoming workouts (limit to 5)
        setUpcomingWorkouts(workoutsData.workouts.slice(0, 5));
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link href="/workouts">
              <Card className="hover:shadow-xl transition-all cursor-pointer border-2 border-coastal-search hover:border-coastal-sky bg-pure-gray">
                <h3 className="text-xl font-bold text-pure-white mb-2">View All Workouts</h3>
                <p className="text-gray-300">Browse and register for upcoming workouts</p>
              </Card>
            </Link>

            <Link href="/workouts/create">
              <Card className="hover:shadow-xl transition-all cursor-pointer border-2 border-coastal-search hover:border-pure-green bg-pure-gray">
                <h3 className="text-xl font-bold text-pure-white mb-2">Create Workout</h3>
                <p className="text-gray-300">Add a new workout for the community</p>
              </Card>
            </Link>

            <Link href="/archive">
              <Card className="hover:shadow-xl transition-all cursor-pointer border-2 border-coastal-search hover:border-coastal-honey bg-pure-gray">
                <h3 className="text-xl font-bold text-pure-white mb-2">Workout Archive</h3>
                <p className="text-gray-300">Browse your library of {346} templates</p>
              </Card>
            </Link>
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
