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
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleCopySchedule = async () => {
    setCopying(true);
    try {
      const res = await fetch('/api/workouts?filter=upcoming');
      const data = await res.json();
      const workouts = (data.workouts || []).filter((w: any) => !w.deleted_at);

      if (workouts.length === 0) {
        await navigator.clipboard.writeText('No upcoming workouts planned.');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }

      const lines: string[] = ['Planned Workouts\n'];
      for (const w of workouts) {
        const d = new Date(w.date);
        const dateStr = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        lines.push(`${dateStr}, ${timeStr} – ${w.title} (${w.workout_type})`);

        const names: string[] = [
          ...(w.participants || []).map((p: any) => p.user_name),
          ...(w.guests || []).map((g: any) => `${g.name} (Guest)`),
        ];
        lines.push(names.length > 0 ? `Attendees: ${names.join(', ')}` : 'Attendees: –');
        lines.push('');
      }

      await navigator.clipboard.writeText(lines.join('\n').trimEnd());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently ignore clipboard errors
    } finally {
      setCopying(false);
    }
  };

  if (authLoading || (annLoading && statsLoading)) return <Loading />;

  const attendanceRate = stats?.total_registrations > 0
    ? Math.round((stats.attended_registrations / stats.total_registrations) * 100)
    : 0;

  const topCards = [
    { label: 'Members', value: stats?.total_users ?? 0, color: 'text-coastal-sky' },
    { label: 'Active Workouts', value: stats?.total_workouts ?? 0, color: 'text-pure-accent-ink' },
    { label: 'This Month', value: stats?.workouts_this_month ?? 0, color: 'text-coastal-honey' },
    { label: 'Upcoming', value: stats?.upcoming_workouts ?? 0, color: 'text-coastal-day' },
    { label: 'Total Sign-ups', value: stats?.total_registrations ?? 0, color: 'text-coastal-sky' },
    { label: 'Attendance Rate', value: `${attendanceRate}%`, color: 'text-pure-accent-ink' },
    { label: 'Cancelled', value: stats?.cancelled_workouts ?? 0, color: 'text-red-600' },
    { label: 'Attended Sessions', value: stats?.attended_registrations ?? 0, color: 'text-coastal-honey' },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-bg py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-pure-ink">Admin Overview</h1>
              <p className="text-pure-text-light mt-1">Gym at a glance</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopySchedule}
                disabled={copying}
                className="px-4 py-2 rounded-lg border border-gray-300 text-pure-ink hover:bg-pure-surface transition font-medium text-sm disabled:opacity-50"
              >
                {copied ? '✓ Copied!' : copying ? 'Copying…' : 'Copy Schedule'}
              </button>
              <Link
                href="/admin/users"
                className="px-4 py-2 rounded-lg border border-gray-300 text-pure-ink hover:bg-pure-surface transition font-medium text-sm"
              >
                Manage Users →
              </Link>
            </div>
          </div>

          {/* Announcements — kept at top for quick access */}
          <Card className="bg-pure-surface border-gray-200 mb-8">
            <h2 className="text-xl font-bold text-pure-ink mb-4">Announcements</h2>
            <div className="space-y-3 mb-5">
              <input
                type="text"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Title (e.g. Gym closed this Saturday)"
                className="w-full px-4 py-2 bg-pure-bg border border-gray-300 rounded-lg text-pure-ink placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pure-green text-sm"
              />
              <textarea
                value={annBody}
                onChange={(e) => setAnnBody(e.target.value)}
                placeholder="Optional message body…"
                rows={2}
                className="w-full px-4 py-2 bg-pure-bg border border-gray-300 rounded-lg text-pure-ink placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pure-green text-sm resize-none"
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
                  <div key={a.id} className="flex items-start justify-between gap-3 bg-pure-bg border border-gray-200 rounded-lg px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-pure-ink text-sm">{a.title}</p>
                      {a.body && <p className="text-pure-text-light text-xs mt-0.5">{a.body}</p>}
                    </div>
                    <button
                      onClick={() => handleRemoveAnnouncement(a.id)}
                      className="shrink-0 text-xs text-red-600 hover:text-red-700 transition"
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
              <div key={label} className="bg-pure-surface border border-gray-200 rounded-lg p-4 text-center">
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="text-sm text-pure-text-light mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Top members */}
          <Card className="bg-pure-surface border-gray-200">
            <h2 className="text-xl font-bold text-pure-ink mb-4">Most Active Members</h2>
            {!stats?.top_members?.length ? (
              <p className="text-pure-text-light text-sm">No attendance data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-sm text-pure-text-light">
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
                        <tr key={m.id} className="border-b border-gray-200 last:border-0">
                          <td className="py-3 pr-4 text-pure-text-light text-sm">{i + 1}</td>
                          <td className="py-3 pr-4 text-pure-ink font-medium">{m.name}</td>
                          <td className="py-3 pr-4 text-pure-text-light text-right">{m.total_registered}</td>
                          <td className="py-3 pr-4 text-pure-accent-ink font-semibold text-right">{m.attended}</td>
                          <td className="py-3 text-right">
                            <span className={`text-sm font-semibold ${rate >= 80 ? 'text-pure-accent-ink' : rate >= 50 ? 'text-coastal-honey' : 'text-red-600'}`}>
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
