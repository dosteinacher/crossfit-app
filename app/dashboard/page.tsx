'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
        setUpcomingWorkouts(workoutsData.workouts.filter((w: any) => w.is_registered).slice(0, 5));
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-4xl font-bold mb-8 text-gray-800">
            Welcome back, {user?.name}!
          </h1>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <h3 className="text-sm font-medium opacity-90">Total Workouts</h3>
              <p className="text-4xl font-bold mt-2">{stats?.total_workouts || 0}</p>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <h3 className="text-sm font-medium opacity-90">Attended</h3>
              <p className="text-4xl font-bold mt-2">{stats?.attended_workouts || 0}</p>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <h3 className="text-sm font-medium opacity-90">Upcoming</h3>
              <p className="text-4xl font-bold mt-2">{stats?.upcoming_workouts || 0}</p>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <h3 className="text-sm font-medium opacity-90">Current Streak</h3>
              <p className="text-4xl font-bold mt-2">{stats?.current_streak || 0}</p>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link href="/workouts">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500">
                <h3 className="text-xl font-bold text-gray-800 mb-2">View All Workouts</h3>
                <p className="text-gray-600">Browse and register for upcoming workouts</p>
              </Card>
            </Link>

            <Link href="/workouts/create">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Create Workout</h3>
                <p className="text-gray-600">Add a new workout for the community</p>
              </Card>
            </Link>

            <Link href="/workouts?filter=past">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Workout History</h3>
                <p className="text-gray-600">View your past workouts and progress</p>
              </Card>
            </Link>
          </div>

          {/* Upcoming Registered Workouts */}
          <Card>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Your Upcoming Workouts</h2>
            
            {upcomingWorkouts.length === 0 ? (
              <p className="text-gray-600">You haven't registered for any upcoming workouts yet.</p>
            ) : (
              <div className="space-y-4">
                {upcomingWorkouts.map((workout) => (
                  <Link key={workout.id} href={`/workouts/${workout.id}`}>
                    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{workout.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{workout.workout_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-blue-600">
                            {format(new Date(workout.date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-gray-600">
                            {format(new Date(workout.date), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
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
