'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Loading, Button, ErrorMessage, SuccessMessage } from '@/components/ui';
import { format } from 'date-fns';

export default function UsersAdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndFetchUsers();
  }, []);

  const checkAuthAndFetchUsers = async () => {
    try {
      // Check if admin
      const sessionResponse = await fetch('/api/auth/session');
      if (!sessionResponse.ok) {
        router.push('/login');
        return;
      }
      const sessionData = await sessionResponse.json();
      setCurrentUser(sessionData.user);

      if (!sessionData.user.is_admin) {
        router.push('/dashboard');
        return;
      }

      // Fetch all users
      const usersResponse = await fetch('/api/admin/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
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
        checkAuthAndFetchUsers(); // Refresh list
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
      <div className="min-h-screen bg-pure-dark py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-pure-white">User Management</h1>
            <div className="text-sm text-gray-400">
              Total Users: {users.length}
            </div>
          </div>

          {error && <ErrorMessage message={error} />}
          {success && <SuccessMessage message={success} />}

          <div className="bg-pure-gray border border-pure-green rounded-lg p-4 mb-6">
            <h3 className="font-bold text-pure-green mb-2">👥 Admin Panel</h3>
            <p className="text-gray-300">
              Manage all registered users. You can view their details and remove users if needed.
            </p>
          </div>

          {/* Users Table */}
          <Card className="bg-pure-gray border-gray-700 overflow-x-auto">
            {users.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No users registered yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-pure-white font-semibold">Name</th>
                      <th className="text-left py-3 px-4 text-pure-white font-semibold">Email</th>
                      <th className="text-left py-3 px-4 text-pure-white font-semibold">Role</th>
                      <th className="text-left py-3 px-4 text-pure-white font-semibold">Stats</th>
                      <th className="text-left py-3 px-4 text-pure-white font-semibold">Joined</th>
                      <th className="text-right py-3 px-4 text-pure-white font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-800 hover:bg-pure-dark transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-pure-white font-medium">{user.name}</span>
                            {user.id === currentUser?.id && (
                              <span className="text-xs px-2 py-1 bg-blue-900 text-blue-200 rounded">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-400">{user.email}</td>
                        <td className="py-3 px-4">
                          {user.is_admin ? (
                            <span className="text-xs px-2 py-1 bg-purple-900 text-purple-200 rounded font-medium">
                              Admin
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                              Member
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-400">
                            <div>{user.stats?.total_workouts || 0} workouts</div>
                            <div className="text-xs">{user.stats?.attended_workouts || 0} attended</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {user.id !== currentUser?.id ? (
                            <Button
                              variant="danger"
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              className="text-sm"
                            >
                              Delete
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-500">Can't delete yourself</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="mt-6 text-sm text-gray-400">
            <p>💡 <strong>Tip:</strong> To add new users, share the invite code <span className="text-pure-green font-mono">PURE2026</span> with them.</p>
          </div>
        </div>
      </div>
    </>
  );
}
