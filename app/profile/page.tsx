'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Loading, Button, Input, ErrorMessage, SuccessMessage } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths, startOfMonth } from 'date-fns';

export default function ProfilePage() {
  const { loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Name form
  const [name, setName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Notification prefs
  const [notifyUpdates, setNotifyUpdates] = useState(true);
  const [notifyCancellations, setNotifyCancellations] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // iCal
  const [calendarUrl, setCalendarUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((data) => {
        setProfile(data.user);
        setStats(data.stats);
        setName(data.user.name);
        setNotifyUpdates(data.user.notify_updates ?? true);
        setNotifyCancellations(data.user.notify_cancellations ?? true);
        const base = window.location.origin;
        setCalendarUrl(`${base}/api/calendar.ics?token=${data.user.calendar_token}`);
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [authLoading]);

  const handleSaveName = async () => {
    setError(''); setSuccess('');
    setNameSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_name', name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setProfile((p: any) => ({ ...p, name: data.user.name }));
      setSuccess('Name updated.');
    } finally { setNameSaving(false); }
  };

  const handleChangePassword = async () => {
    setError(''); setSuccess('');
    if (newPassword !== confirmPassword) { setError('New passwords do not match'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_password', current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess('Password changed.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } finally { setPasswordSaving(false); }
  };

  const handleSavePrefs = async () => {
    setError(''); setSuccess('');
    setPrefsSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_notifications', notify_updates: notifyUpdates, notify_cancellations: notifyCancellations }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess('Notification preferences saved.');
    } finally { setPrefsSaving(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(calendarUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (authLoading || loading) return <Loading />;

  const attendanceRate = stats?.total_workouts > 0
    ? Math.round((stats.attended_workouts / stats.total_workouts) * 100)
    : 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-dark py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-bold text-pure-white mb-2">My Profile</h1>
          <p className="text-pure-text-light mb-8">{profile?.email}</p>

          {error && <ErrorMessage message={error} />}
          {success && <SuccessMessage message={success} />}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Workouts Registered', value: stats?.total_workouts ?? 0, color: 'text-coastal-sky' },
              { label: 'Attended', value: stats?.attended_workouts ?? 0, color: 'text-pure-green' },
              { label: 'Attendance Rate', value: `${attendanceRate}%`, color: 'text-coastal-honey' },
              { label: 'Upcoming', value: stats?.upcoming_workouts ?? 0, color: 'text-coastal-day' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-pure-gray border border-gray-700 rounded-lg p-4 text-center">
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="text-sm text-pure-text-light mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Monthly progress chart */}
          {(() => {
            const months = Array.from({ length: 6 }, (_, i) => {
              const d = startOfMonth(subMonths(new Date(), 5 - i));
              return format(d, 'yyyy-MM');
            });
            const dataMap = new Map((stats?.monthly_workouts || []).map((m: any) => [m.month, m]));
            const chartData = months.map((month) => ({
              month,
              label: format(new Date(month + '-15'), 'MMM'),
              registered: (dataMap.get(month) as any)?.registered ?? 0,
              attended: (dataMap.get(month) as any)?.attended ?? 0,
            }));
            const maxVal = Math.max(...chartData.map((d) => d.registered), 1);
            const hasData = chartData.some((d) => d.registered > 0);
            if (!hasData) return null;
            return (
              <div className="bg-pure-gray border border-gray-700 rounded-lg p-5 mb-6">
                <h2 className="text-lg font-bold text-pure-white mb-4">Monthly Activity</h2>
                <div className="flex items-end gap-3 h-28">
                  {chartData.map(({ month, label, registered, attended }) => (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1 h-full">
                      <div className="flex-1 w-full flex items-end gap-0.5">
                        <div
                          className="flex-1 bg-coastal-sky/30 rounded-t transition-all"
                          style={{ height: registered > 0 ? `${(registered / maxVal) * 100}%` : '4px' }}
                          title={`${registered} registered`}
                        />
                        <div
                          className="flex-1 bg-pure-green rounded-t transition-all"
                          style={{ height: attended > 0 ? `${(attended / maxVal) * 100}%` : '0' }}
                          title={`${attended} attended`}
                        />
                      </div>
                      <span className="text-xs text-pure-text-light">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-3 justify-end">
                  <span className="flex items-center gap-1.5 text-xs text-pure-text-light">
                    <span className="w-3 h-3 rounded-sm bg-coastal-sky/30 inline-block" />Registered
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-pure-text-light">
                    <span className="w-3 h-3 rounded-sm bg-pure-green inline-block" />Attended
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-6">
              {/* Change name */}
              <Card>
                <h2 className="text-xl font-bold text-pure-white mb-4">Display Name</h2>
                <Input
                  label="Name"
                  value={name}
                  onChange={(v) => setName(v)}
                  placeholder="Your name"
                />
                <Button onClick={handleSaveName} disabled={nameSaving || !name.trim()} className="mt-3 w-full">
                  {nameSaving ? 'Saving…' : 'Save Name'}
                </Button>
              </Card>

              {/* Change password */}
              <Card>
                <h2 className="text-xl font-bold text-pure-white mb-4">Change Password</h2>
                <div className="space-y-3">
                  <Input
                    label="Current password"
                    type="password"
                    value={currentPassword}
                    onChange={(v) => setCurrentPassword(v)}
                    placeholder="Current password"
                  />
                  <Input
                    label="New password"
                    type="password"
                    value={newPassword}
                    onChange={(v) => setNewPassword(v)}
                    placeholder="New password (min 8 chars)"
                  />
                  <Input
                    label="Confirm new password"
                    type="password"
                    value={confirmPassword}
                    onChange={(v) => setConfirmPassword(v)}
                    placeholder="Confirm new password"
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                  className="mt-3 w-full"
                >
                  {passwordSaving ? 'Saving…' : 'Change Password'}
                </Button>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Notification preferences */}
              <Card>
                <h2 className="text-xl font-bold text-pure-white mb-4">Email Notifications</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Workout updates', sublabel: 'When a workout you\'re registered for is edited', value: notifyUpdates, onChange: setNotifyUpdates },
                    { label: 'Cancellations', sublabel: 'When a workout you\'re registered for is cancelled', value: notifyCancellations, onChange: setNotifyCancellations },
                  ].map(({ label, sublabel, value, onChange }) => (
                    <label key={label} className="flex items-start gap-3 cursor-pointer">
                      <div className="relative mt-0.5 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => onChange(e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          className={`w-10 h-6 rounded-full transition ${value ? 'bg-pure-green' : 'bg-gray-600'}`}
                          onClick={() => onChange(!value)}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
                        </div>
                      </div>
                      <div>
                        <p className="text-pure-white font-medium text-sm">{label}</p>
                        <p className="text-pure-text-light text-xs mt-0.5">{sublabel}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <Button onClick={handleSavePrefs} disabled={prefsSaving} className="mt-4 w-full">
                  {prefsSaving ? 'Saving…' : 'Save Preferences'}
                </Button>
              </Card>

              {/* Calendar subscription */}
              <Card>
                <h2 className="text-xl font-bold text-pure-white mb-2">Calendar Subscription</h2>
                <p className="text-pure-text-light text-sm mb-4">
                  Subscribe to your workouts in Google Calendar, Apple Calendar, or Outlook. The feed auto-updates when workouts change.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={calendarUrl}
                    className="flex-1 px-3 py-2 bg-pure-dark border border-gray-600 rounded-lg text-pure-text-light text-xs font-mono truncate focus:outline-none"
                  />
                  <Button onClick={handleCopy} variant="secondary" className="shrink-0">
                    {copied ? '✓ Copied' : 'Copy'}
                  </Button>
                </div>
                <p className="text-pure-text-light text-xs mt-2">
                  Treat this URL like a password — it gives read access to your workout schedule.
                </p>
              </Card>
            </div>
          </div>

          {/* Recent workouts */}
          {stats?.recent_workouts?.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-pure-white mb-4">Recent Workouts</h2>
              <div className="space-y-2">
                {stats.recent_workouts.map((w: any) => (
                  <Link key={w.id} href={`/workouts/${w.id}`} className="block group">
                    <div className="bg-pure-gray border border-gray-700 rounded-lg p-4 hover:border-coastal-sky transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${w.attended ? 'bg-pure-green/20 text-pure-green border border-pure-green/30' : 'bg-gray-700 text-gray-400'}`}>
                            {w.attended ? '✓ Attended' : 'Registered'}
                          </span>
                          <span className="text-pure-white font-medium truncate group-hover:text-coastal-sky transition">{w.title}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          {w.rating && (
                            <span className="text-coastal-honey text-sm font-medium">{w.rating}/5</span>
                          )}
                          <span className="text-pure-text-light text-sm">{format(new Date(w.date), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      {w.result && (
                        <p className="text-pure-text-light text-sm mt-1.5 ml-[calc(theme(spacing.2)+1.25rem+theme(spacing.3))]">
                          {w.result}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
