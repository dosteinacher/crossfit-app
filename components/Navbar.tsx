'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Session fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) return null;

  if (!user) {
    return (
      <nav className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold">
              Crossfit Workouts
            </Link>
            <div className="flex gap-4">
              <Link
                href="/login"
                className="hover:bg-blue-700 px-4 py-2 rounded-lg transition"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold">
            Crossfit Workouts
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-6 items-center">
            <Link
              href="/dashboard"
              className={`hover:bg-blue-700 px-4 py-2 rounded-lg transition ${
                pathname === '/dashboard' ? 'bg-blue-700' : ''
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/workouts"
              className={`hover:bg-blue-700 px-4 py-2 rounded-lg transition ${
                pathname === '/workouts' ? 'bg-blue-700' : ''
              }`}
            >
              Workouts
            </Link>
            <Link
              href="/workouts/create"
              className={`hover:bg-blue-700 px-4 py-2 rounded-lg transition ${
                pathname === '/workouts/create' ? 'bg-blue-700' : ''
              }`}
            >
              Create Workout
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-sm">
                {user.name}
                {user.is_admin && (
                  <span className="ml-2 bg-yellow-500 text-xs px-2 py-1 rounded">
                    Admin
                  </span>
                )}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-2">
            <span className="text-sm">{user.name}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden mt-4 flex flex-col gap-2">
          <Link
            href="/dashboard"
            className={`hover:bg-blue-700 px-4 py-2 rounded-lg transition ${
              pathname === '/dashboard' ? 'bg-blue-700' : ''
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/workouts"
            className={`hover:bg-blue-700 px-4 py-2 rounded-lg transition ${
              pathname === '/workouts' ? 'bg-blue-700' : ''
            }`}
          >
            Workouts
          </Link>
          <Link
            href="/workouts/create"
            className={`hover:bg-blue-700 px-4 py-2 rounded-lg transition ${
              pathname === '/workouts/create' ? 'bg-blue-700' : ''
            }`}
          >
            Create Workout
          </Link>
        </div>
      </div>
    </nav>
  );
}
