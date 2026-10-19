'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Avatar, Badge, Button, Card, ErrorMessage, Loading, SuccessMessage } from '@/components/ui';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

type AdminUser = {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  stats?: {
    total_workouts?: number;
    attended_workouts?: number;
  };
};

export default function UsersAdminPage() {
  const router = useRouter();
  const { user: currentUser, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openMenuUserId, setOpenMenuUserId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!currentUser) return; // useAuth already redirects to /login
    if (!currentUser.is_admin) {
      router.push('/dashboard');
      return;
    }
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => setError('Failed to load users'));
  }, [currentUser, loading, router]);

  const handleToggleAdmin = async (userId: number, userName: string, makeAdmin: boolean) => {
    setOpenMenuUserId(null);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: makeAdmin }),
      });

      if (response.ok) {
        setSuccess(`${userName} is now ${makeAdmin ? 'an admin' : 'a member'}`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_admin: makeAdmin } : u))
        );
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update user');
      }
    } catch {
      setError('An error occurred. Please try again.');
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    setError('');
    setSuccess('');
    setDeletingUserId(userId);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess(`${userName} has been deleted`);
        setUsers((prev) => prev.filter((user) => user.id !== userId));
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete user');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setDeletingUserId(null);
      setDeleteTarget(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-canvas py-6 md:py-10">
        <div className="mx-auto max-w-[1120px] space-y-6 px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link href="/admin" className="text-sm font-bold text-ink-2 underline decoration-line underline-offset-4 hover:text-ink">← Admin overview</Link>
              <h1 className="mt-3 font-display text-4xl font-extrabold text-ink md:text-5xl">User Management</h1>
            </div>
            <p className="text-base text-ink-2"><span className="font-bold tabular-nums text-ink">{users.length}</span> members</p>
          </div>

          {error && <ErrorMessage message={error} />}
          {success && <SuccessMessage message={success} />}

          <Card className="overflow-hidden !p-0">
            {users.length === 0 ? (
              <p className="px-6 py-10 text-center text-base text-ink-2">No users registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead>
                    <tr className="border-b border-line text-left text-[13px] font-bold uppercase tracking-wide text-ink-2">
                      <th className="px-5 py-4">Member</th>
                      <th className="px-5 py-4">Email</th>
                      <th className="px-5 py-4">Role</th>
                      <th className="px-5 py-4">Activity</th>
                      <th className="px-5 py-4">Joined</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="h-[68px] border-b border-line-2 last:border-0 hover:bg-canvas">
                        <td className="px-5">
                          <div className="flex items-center gap-3">
                            <Avatar initials={user.name.split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()} className="h-9 w-9" />
                            <span className="font-semibold text-ink">{user.name}</span>
                            {user.id === currentUser?.id && (
                              <Badge variant="neutral">You</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-5 text-sm text-ink-2">{user.email}</td>
                        <td className="px-5">
                          <Badge variant={user.is_admin ? 'dark' : 'neutral'}>{user.is_admin ? 'Admin' : 'Member'}</Badge>
                        </td>
                        <td className="px-5">
                          <div className="text-sm text-ink">
                            <span className="font-semibold tabular-nums">{user.stats?.total_workouts || 0}</span>
                            <span className="text-ink-2"> workouts</span>
                            <div className="mt-0.5 text-[13px] text-ink-2">
                              {user.stats?.attended_workouts || 0} attended
                            </div>
                          </div>
                        </td>
                        <td className="px-5 text-sm text-ink-2">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="px-5 text-right">
                          {user.id !== currentUser?.id ? (
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                aria-label={`Actions for ${user.name}`}
                                aria-haspopup="menu"
                                aria-expanded={openMenuUserId === user.id}
                                onClick={() => setOpenMenuUserId((openId) => openId === user.id ? null : user.id)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-sm text-2xl text-ink-2 hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15"
                              >
                                ⋯
                              </button>
                              {openMenuUserId === user.id && (
                                <div role="menu" className="absolute right-0 z-20 mt-1 w-48 rounded-sm border border-line bg-paper py-1 text-left shadow-card">
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => handleToggleAdmin(user.id, user.name, !user.is_admin)}
                                    className="min-h-11 w-full px-3 text-left text-sm font-semibold text-ink hover:bg-canvas"
                                  >
                                    {user.is_admin ? 'Remove admin role' : 'Make admin'}
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => { setOpenMenuUserId(null); setDeleteTarget({ id: user.id, name: user.name }); }}
                                    className="min-h-11 w-full px-3 text-left text-sm font-semibold text-danger hover:bg-canvas"
                                  >
                                    Delete member
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[13px] text-ink-2">Your account</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="text-sm text-ink-2">
            <p><strong className="text-ink">Tip:</strong> To add members, share the invite code. You can change it anytime in your Vercel environment variables (<span className="font-mono text-ink">INVITE_CODE</span>).</p>
          </div>
        </div>
      </main>
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            aria-describedby="delete-user-description"
            className="w-full max-w-md rounded-lg border border-line bg-paper p-6 shadow-card"
          >
            <h2 id="delete-user-title" className="font-display text-2xl font-extrabold text-ink">Delete member?</h2>
            <p id="delete-user-description" className="mt-3 text-base text-ink-2">
              This permanently deletes <span className="font-bold text-ink">{deleteTarget.name}</span> and cannot be undone.
            </p>
            {error && <p role="alert" className="mt-3 text-sm font-semibold text-danger">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deletingUserId !== null}>Cancel</Button>
              <Button
                onClick={() => handleDeleteUser(deleteTarget.id, deleteTarget.name)}
                disabled={deletingUserId !== null}
                className="!bg-danger !text-white hover:!brightness-95"
              >
                {deletingUserId === deleteTarget.id ? 'Deleting…' : 'Delete member'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
