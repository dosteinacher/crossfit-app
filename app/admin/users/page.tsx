'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Loading, Button, ErrorMessage, SuccessMessage } from '@/components/ui';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

export default function UsersAdminPage() {
  const router = useRouter();
  const { user: currentUser, loading } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    const action = makeAdmin ? 'make' : 'remove';
    if (!confirm(`Are you sure you want to ${action} ${userName} ${makeAdmin ? 'an admin' : 'a member'}?`)) {
      return;
    }

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
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This cannot be undone.`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess(`${userName} has been deleted`);
        // Refresh list
        fetch('/api/admin/users')
          .then((r) => r.json())
          .then((data) => setUsers(data.users || []))
          .catch(console.error);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete user');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-bg py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-pure-ink">User Management</h1>
            <div className="text-sm text-pure-text-light">
              Total Users: {users.length}
            </div>
          </div>

          {error && <ErrorMessage message={error} />}
          {success && <SuccessMessage message={success} />}

          <div className="bg-pure-surface border border-pure-green rounded-lg p-4 mb-6">
            <h3 className="font-bold text-pure-accent-ink mb-2">Admin Panel</h3>
            <p className="text-pure-text-light">
              Manage all registered users. You can view their details and remove users if needed.
            </p>
          </div>

          {/* Users Table */}
          <Card className="bg-pure-surface border-gray-300 overflow-x-auto">
            {users.length === 0 ? (
              <p className="text-pure-text-light text-center py-8">No users registered yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-3 px-4 text-pure-ink font-semibold">Name</th>
                      <th className="text-left py-3 px-4 text-pure-ink font-semibold">Email</th>
                      <th className="text-left py-3 px-4 text-pure-ink font-semibold">Role</th>
                      <th className="text-left py-3 px-4 text-pure-ink font-semibold">Stats</th>
                      <th className="text-left py-3 px-4 text-pure-ink font-semibold">Joined</th>
                      <th className="text-right py-3 px-4 text-pure-ink font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-300 hover:bg-pure-bg transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-pure-ink font-medium">{user.name}</span>
                            {user.id === currentUser?.id && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-pure-text-light">{user.email}</td>
                        <td className="py-3 px-4">
                          {user.is_admin ? (
                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                              Admin
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-pure-text-light rounded">
                              Member
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-pure-text-light">
                            <div>{user.stats?.total_workouts || 0} workouts</div>
                            <div className="text-xs">{user.stats?.attended_workouts || 0} attended</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-pure-text-light">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            {user.id !== currentUser?.id ? (
                              <>
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    handleToggleAdmin(user.id, user.name, !user.is_admin)
                                  }
                                  className="text-sm"
                                >
                                  {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                                </Button>
                                <Button
                                  variant="danger"
                                  onClick={() => handleDeleteUser(user.id, user.name)}
                                  className="text-sm"
                                >
                                  Delete
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-pure-text-light">Can't edit yourself</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="mt-6 text-sm text-pure-text-light">
            <p><strong>Tip:</strong> To add new users, share the invite code with them. You can change it anytime in your Vercel environment variables (<span className="font-mono">INVITE_CODE</span>).</p>
          </div>
        </div>
      </div>
    </>
  );
}
