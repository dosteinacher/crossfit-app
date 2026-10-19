'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Avatar, Button, Card, Loading } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

type AdminTopMember = {
  id: number;
  name: string;
  total_registered: number;
  attended: number;
};

type AdminStats = {
  total_users: number;
  total_registrations: number;
  attended_registrations: number;
  upcoming_workouts: number;
  workouts_this_month: number;
  cancelled_workouts: number;
  top_members: AdminTopMember[];
};

type Announcement = {
  id: number;
  title: string;
  body?: string;
  creator_name?: string;
};

type ScheduleWorkout = {
  date: string;
  title: string;
  workout_type: string;
  deleted_at?: string | null;
  participants?: Array<{ user_name: string }>;
  guests?: Array<{ name: string }>;
};

export default function AdminOverviewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annSaving, setAnnSaving] = useState(false);
  const [announcementError, setAnnouncementError] = useState('');
  const announcementBodyRef = useRef<HTMLTextAreaElement>(null);
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
    setAnnouncementError('');
    setAnnSaving(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: annTitle, body: annBody }),
      });
      if (!res.ok) throw new Error('Could not post the announcement');
      const data: { announcement: Announcement } = await res.json();
      setAnnouncements((prev) => [{ ...data.announcement, creator_name: user?.name }, ...prev]);
      setAnnTitle(''); setAnnBody('');
      if (announcementBodyRef.current) announcementBodyRef.current.style.height = 'auto';
    } catch (error) {
      console.error('Post announcement error:', error);
      setAnnouncementError('Could not post the announcement.');
    } finally {
      setAnnSaving(false);
    }
  };

  const handleRemoveAnnouncement = async (id: number) => {
    try {
      const response = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not remove announcement');
      setAnnouncements((prev) => prev.filter((announcement) => announcement.id !== id));
    } catch (error) {
      console.error('Remove announcement error:', error);
      setAnnouncementError('Could not remove the announcement.');
    }
  };

  const handleCopySchedule = async () => {
    setCopying(true);
    try {
      const res = await fetch('/api/workouts?filter=upcoming');
      const data: { workouts?: ScheduleWorkout[] } = await res.json();
      const workouts = (data.workouts || []).filter((workout) => !workout.deleted_at);

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
          ...(w.participants || []).map((participant) => participant.user_name),
          ...(w.guests || []).map((guest) => `${guest.name} (Guest)`),
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

  const attendanceRate = stats && stats.total_registrations > 0
    ? Math.round((stats.attended_registrations / stats.total_registrations) * 100)
    : 0;

  const topCards = [
    { label: 'Members', value: stats?.total_users ?? 0 },
    { label: 'Upcoming', value: stats?.upcoming_workouts ?? 0 },
    { label: 'Attendance rate', value: `${attendanceRate}%` },
    { label: 'Workouts this month', value: stats?.workouts_this_month ?? 0 },
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-canvas py-6 md:py-10">
        <div className="mx-auto max-w-[1120px] space-y-8 px-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-[58px] font-black leading-[.82] tracking-[-.01em] text-ink md:text-[96px]">Admin Overview</h1>
              <p className="mt-2 text-base text-ink-2">Gym at a glance.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopySchedule}
                disabled={copying}
                className="inline-flex min-h-11 items-center rounded-sm border border-line bg-paper px-4 text-sm font-bold text-ink hover:bg-canvas disabled:opacity-50"
              >
                {copied ? '✓ Copied!' : copying ? 'Copying…' : 'Copy Schedule'}
              </button>
              <Link
                href="/admin/users"
                className="inline-flex min-h-11 items-center rounded-sm bg-ink px-4 text-sm font-bold text-white hover:bg-ink-2"
              >
                Manage Users →
              </Link>
            </div>
          </div>

          {/* Announcements — kept at top for quick access */}
          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold uppercase text-ink">Announcements</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Title (e.g. Gym closed this Saturday)"
                aria-label="Announcement title"
                className="min-h-11 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
              />
              <textarea
                ref={announcementBodyRef}
                value={annBody}
                onChange={(e) => {
                  setAnnBody(e.target.value);
                  e.currentTarget.style.height = 'auto';
                  e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                }}
                placeholder="Optional message body…"
                rows={2}
                className="min-h-20 w-full resize-none rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
              />
              <div className="flex justify-end">
                <Button onClick={handlePostAnnouncement} disabled={annSaving || !annTitle.trim()}>
                  {annSaving ? 'Posting…' : 'Post'}
                </Button>
              </div>
            </div>
            {announcementError && <p role="alert" className="mt-3 text-sm font-semibold text-ink-2">{announcementError}</p>}

            {announcements.length === 0 ? (
              <p className="mt-5 border-t border-line-2 pt-4 text-base text-ink-2">No active announcements.</p>
            ) : (
              <div className="mt-5 divide-y divide-line-2 border-t border-line-2">
                {announcements.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{a.title}</p>
                      {a.body && <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{a.body}</p>}
                    </div>
                    <button
                      onClick={() => handleRemoveAnnouncement(a.id)}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-sm px-3 text-sm font-bold text-ink-2 hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Stats grid */}
          <div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {topCards.map(({ label, value }) => (
                <Card key={label} className="flex min-h-32 flex-col justify-center !p-4">
                  <p className="font-display text-5xl font-extrabold leading-none tabular-nums text-ink">{value}</p>
                  <p className="mt-2 text-[13px] font-bold uppercase tracking-wide text-ink-2">{label}</p>
                </Card>
              ))}
            </div>
            <p className="mt-3 text-sm text-ink-2">
              Also: {stats?.total_registrations ?? 0} total sign-ups · {stats?.attended_registrations ?? 0} attended sessions · {stats?.cancelled_workouts ?? 0} cancelled
            </p>
          </div>

          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold uppercase text-ink">Most Active Members</h2>
            {!stats?.top_members?.length ? (
              <p className="text-base text-ink-2">No attendance data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse">
                  <thead>
                    <tr className="border-b border-line text-left text-[13px] font-bold uppercase tracking-wide text-ink-2">
                      <th className="pb-3 pr-4">#</th>
                      <th className="pb-3 pr-4">Member</th>
                      <th className="pb-3 pr-4 text-right">Sign-ups</th>
                      <th className="pb-3 pr-4 text-right">Attended</th>
                      <th className="pb-3 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_members.map((member, index) => {
                      const rate = member.total_registered > 0
                        ? Math.round((member.attended / member.total_registered) * 100)
                        : 0;
                      const initials = member.name.split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase();
                      return (
                        <tr key={member.id} className="h-14 border-b border-line-2 last:border-0">
                          <td className="pr-4 text-sm tabular-nums text-ink-2">{index + 1}</td>
                          <td className="pr-4">
                            <div className="flex items-center gap-3">
                              <Avatar initials={initials} className="h-9 w-9" />
                              <span className="font-semibold text-ink">{member.name}</span>
                            </div>
                          </td>
                          <td className="pr-4 text-right tabular-nums text-ink-2">{member.total_registered}</td>
                          <td className="pr-4 text-right tabular-nums text-ink">{member.attended}</td>
                          <td className="w-40">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-sm font-bold tabular-nums text-ink">{rate}%</span>
                              <span className="h-2 w-20 overflow-hidden rounded-full bg-line">
                                <span className="block h-full rounded-full bg-ink" style={{ width: `${rate}%` }} />
                              </span>
                            </div>
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
      </main>
    </>
  );
}
