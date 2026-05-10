'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Loading } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export default function AdminOverviewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!user.is_admin) { router.push('/dashboard'); return; }
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => setStats(data))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) return <Loading />;

  const attendanceRate = stats?.total_registrations > 0
    ? Math.round((stats.attended_registrations / stats.total_registrations) * 100)
    : 0;

  const topCards = [
    { label: 'Members', value: stats?.total_users ?? 0, color: 'text-coastal-sky' },
    { label: 'Active Workouts', value: stats?.total_workouts ?? 0, color: 'text-pure-green' },
    { label: 'This Month', value: stats?.workouts_this_month ?? 0, color: 'text-coastal-honey' },
    { label: 'Upcoming', value: stats?.upcoming_workouts ?? 0, color: 'text-coastal-day' },
    { label: 'Total Sign-ups', value: stats?.total_registrations ?? 0, color: 'text-coastal-sky' },
    { label: 'Attendance Rate', value: `${attendanceRate}%`, color: 'text-pure-green' },
    { label: 'Cancelled', value: stats?.cancelled_workouts ?? 0, color: 'text-red-400' },
    { label: 'Attended Sessions', value: stats?.attended_registrations ?? 0, color: 'text-coastal-honey' },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-dark py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-pure-white">Admin Overview</h1>
              <p className="text-pure-text-light mt-1">Gym at a glance</p>
            </div>
            <Link
              href="/admin/users"
              className="px-4 py-2 rounded-lg border border-gray-600 text-pure-white hover:bg-pure-gray transition font-medium text-sm"
            >
              Manage Users →
            </Link>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {topCards.map(({ label, value, color }) => (
              <div key={label} className="bg-pure-gray border border-gray-700 rounded-lg p-4 text-center">
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="text-sm text-pure-text-light mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Top members */}
          <Card className="bg-pure-gray border-gray-700">
            <h2 className="text-xl font-bold text-pure-white mb-4">Most Active Members</h2>
            {!stats?.top_members?.length ? (
              <p className="text-pure-text-light text-sm">No attendance data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700 text-left text-sm text-pure-text-light">
                      <th className="pb-2 pr-4">#</th>
                      <th className="pb-2 pr-4">Member</th>
                      <th className="pb-2 pr-4 text-right">Sign-ups</th>
                      <th className="pb-2 pr-4 text-right">Attended</th>
                      <th className="pb-2 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_members.map((m: any, i: number) => {
                      const rate = m.total_registered > 0
                        ? Math.round((m.attended / m.total_registered) * 100)
                        : 0;
                      return (
                        <tr key={m.id} className="border-b border-gray-800 last:border-0">
                          <td className="py-3 pr-4 text-pure-text-light text-sm">{i + 1}</td>
                          <td className="py-3 pr-4 text-pure-white font-medium">{m.name}</td>
                          <td className="py-3 pr-4 text-pure-text-light text-right">{m.total_registered}</td>
                          <td className="py-3 pr-4 text-pure-green font-semibold text-right">{m.attended}</td>
                          <td className="py-3 text-right">
                            <span className={`text-sm font-semibold ${rate >= 80 ? 'text-pure-green' : rate >= 50 ? 'text-coastal-honey' : 'text-red-400'}`}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
