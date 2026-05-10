'use client';

import Image from 'next/image';
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
      <nav className="bg-pure-dark border-b-2 border-coastal-sky shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/login" className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-coastal-sky rounded" aria-label="GO PURE — Login">
              <Image src="/go-pure-logo.png" alt="PURE" width={140} height={40} className="h-9 w-auto max-h-9 object-contain object-left" priority />
            </Link>
            <div className="flex gap-3">
              <Link href="/login" className="px-4 py-2 rounded-lg border border-gray-600 text-pure-white hover:bg-pure-gray transition font-medium">
                Login
              </Link>
              <Link href="/register" className="px-4 py-2 rounded-lg bg-pure-green text-black hover:bg-pure-accent-light transition font-semibold">
                Register
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-pure-dark border-b-2 border-coastal-sky shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-coastal-sky rounded"
            aria-label="PURE — Dashboard"
          >
            <Image
              src="/go-pure-logo.png"
              alt="PURE"
              width={140}
              height={40}
              className="h-9 w-auto max-h-9 object-contain object-left navbar-brand-spin"
              priority
            />
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-6 items-center">
            <Link
              href="/dashboard"
              className={`hover:bg-coastal-search/20 px-4 py-2 rounded-lg transition text-pure-white ${
                pathname === '/dashboard' ? 'bg-coastal-sky/30 border border-coastal-sky' : ''
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/workouts"
              className={`hover:bg-coastal-search/20 px-4 py-2 rounded-lg transition text-pure-white ${
                pathname === '/workouts' ? 'bg-coastal-sky/30 border border-coastal-sky' : ''
              }`}
            >
              Workouts
            </Link>
            <Link
              href="/calendar"
              className={`hover:bg-coastal-search/20 px-4 py-2 rounded-lg transition text-pure-white ${
                pathname === '/calendar' ? 'bg-coastal-sky/30 border border-coastal-sky' : ''
              }`}
            >
              Calendar
            </Link>
            <Link
              href="/archive"
              className={`hover:bg-coastal-search/20 px-4 py-2 rounded-lg transition text-pure-white ${
                pathname === '/archive' ? 'bg-coastal-sky/30 border border-coastal-sky' : ''
              }`}
            >
              Archive
            </Link>
            <Link
              href="/guidelines"
              className={`hover:bg-coastal-search/20 px-4 py-2 rounded-lg transition text-pure-white ${
                pathname === '/guidelines' ? 'bg-coastal-sky/30 border border-coastal-sky' : ''
              }`}
            >
              Guidelines
            </Link>
            {user.is_admin && (
              <Link
                href="/admin/users"
                className={`hover:bg-coastal-search/20 px-4 py-2 rounded-lg transition text-pure-white ${
                  pathname === '/admin/users' ? 'bg-coastal-sky/30 border border-coastal-sky' : ''
                }`}
              >
                Users
              </Link>
            )}
            <Link
              href="/workouts/create"
              className={`bg-pure-green text-black hover:bg-pure-accent-light px-4 py-2 rounded-lg transition font-semibold ${
                pathname === '/workouts/create' ? 'ring-2 ring-coastal-sky' : ''
              }`}
            >
              Create
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/profile" className="text-sm text-pure-white font-medium hover:text-coastal-sky transition">
                {user.name}
                {user.is_admin && (
                  <span className="ml-2 bg-coastal-honey text-black text-xs px-2 py-1 rounded font-semibold">
                    Admin
                  </span>
                )}
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition text-pure-white font-medium"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-2">
            <span className="text-sm text-pure-white font-medium">{user.name}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm text-pure-white font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden mt-4 flex flex-col gap-2">
          <Link
            href="/dashboard"
            className={`hover:bg-coastal-search/20 px-4 py-2 rounded-lg transition text-pure-white ${
              pathname === '/dashboard' ? 'bg-coastal-sky/30 border border-coastal-sky' : ''
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/workouts"
            className={`hover:bg-coastal-search/20 px-4 py-2 rounded-lg transition text-pure-white ${
              pathname === '/workouts' ? 'bg-coastal-sky/30 border border-coastal-sky' : ''
            }`}
          >
            Workouts
          </Link>
          <Link
            href="/calendar"
            className={`hover:bg-coastal-search/20 px-4 py-2 rounded-lg transition text-pure-white ${
              pathname === '/calendar' ? 'bg-coastal-sky/30 border border-coastal-sky' : ''
            }`}
          >
            Calendar
          </Link>
          <Link
            href="/archive"
            className={`hover:bg-coastal-search/20 px-4 py-2 rounded-lg transition text-pure-white ${
              pathname === '/archive' ? 'bg-coastal-sky/30 border border-coastal-sky' : ''
            }`}
          >
            Archive
          </Link>
          <Link
            href="/guidelines"
            className={`hover:bg-coastal-search/20 px-4 py-2 rounded-lg transition text-pure-white ${
              pathname === '/guidelines' ? 'bg-coastal-sky/30 border border-coastal-sky' : ''
            }`}
          >
            Guidelines
          </Link>
          {user.is_admin && (
            <Link
              href="/admin/users"
              className={`hover:bg-coastal-search/20 px-4 py-2 rounded-lg transition text-pure-white ${
                pathname === '/admin/users' ? 'bg-coastal-sky/30 border border-coastal-sky' : ''
              }`}
            >
              Users
            </Link>
          )}
          <Link
            href="/workouts/create"
            className={`bg-pure-green text-black hover:bg-pure-accent-light px-4 py-2 rounded-lg transition font-semibold ${
              pathname === '/workouts/create' ? 'ring-2 ring-coastal-sky' : ''
            }`}
          >
            Create
          </Link>
        </div>
      </div>
    </nav>
  );
}
