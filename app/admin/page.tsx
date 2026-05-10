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
  const [statsLoading, setStatsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annSaving, setAnnSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!user.is_admin) { router.push('/dashboard'); return; }
    // Load announcements and stats independently so the page renders immediately
    fetch('/api/announcements')
      .then((r) => r.json())
      .then((a) => setAnnouncements(a.announcements || []))
      .finally(() => setAnnLoading(false));
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((s) => setStats(s))
      .finally(() => setStatsLoading(false));
  }, [user, authLoading, router]);

  const handlePostAnnouncement = async () => {
    if (!annTitle.trim()) return;
    setAnnSaving(true);
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: annTitle, body: annBody }),
    });
    if (res.ok) {
      const data = await res.json();
      setAnnouncements((prev) => [{ ...data.announcement, creator_name: user?.name }, ...prev]);
      setAnnTitle(''); setAnnBody('');
    }
    setAnnSaving(false);
  };

  const handleRemoveAnnouncement = async (id: number) => {
    await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  if (authLoading || (annLoading && statsLoading)) return <Loading />;

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

          {/* Announcements — kept at top for quick access */}
          <Card className="bg-pure-gray border-gray-700 mb-8">
            <h2 className="text-xl font-bold text-pure-white mb-4">Announcements</h2>
            <div className="space-y-3 mb-5">
              <input
                type="text"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Title (e.g. Gym closed this Saturday)"
                className="w-full px-4 py-2 bg-pure-dark border border-gray-600 rounded-lg text-pure-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pure-green text-sm"
              />
              <textarea
                value={annBody}
                onChange={(e) => setAnnBody(e.target.value)}
                placeholder="Optional message body…"
                rows={2}
                className="w-full px-4 py-2 bg-pure-dark border border-gray-600 rounded-lg text-pure-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pure-green text-sm resize-none"
              />
              <button
                onClick={handlePostAnnouncement}
                disabled={annSaving || !annTitle.trim()}
                className="px-4 py-2 rounded-lg bg-pure-green text-black font-semibold text-sm hover:bg-pure-accent-light transition disabled:opacity-50"
              >
                {annSaving ? 'Posting…' : 'Post Announcement'}
              </button>
            </div>

            {announcements.length === 0 ? (
              <p className="text-pure-text-light text-sm">No active announcements.</p>
            ) : (
              <div className="space-y-2">
                {announcements.map((a: any) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 bg-pure-dark border border-gray-700 rounded-lg px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-pure-white text-sm">{a.title}</p>
                      {a.body && <p className="text-pure-text-light text-xs mt-0.5">{a.body}</p>}
                    </div>
                    <button
                      onClick={() => handleRemoveAnnouncement(a.id)}
                      className="shrink-0 text-xs text-red-400 hover:text-red-300 transition"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

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
