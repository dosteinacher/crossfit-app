'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/workouts', label: 'Workouts' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/archive', label: 'Archive' },
  { href: '/guidelines', label: 'Guidelines' },
];

const ADMIN_LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setUser(data.user); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    router.push('/login');
  };

  if (loading) return null;

  if (!user) {
    return (
      <nav className="sticky top-0 z-50 bg-pure-dark border-b-2 border-coastal-sky shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link href="/login" className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-coastal-sky rounded" aria-label="GO PURE — Login">
              <Image src="/go-pure-logo.png" alt="PURE" width={120} height={36} className="h-8 w-auto object-contain object-left" priority />
            </Link>
            <div className="flex gap-2">
              <Link href="/login" className="px-4 py-2 rounded-lg border border-gray-600 text-pure-white hover:bg-pure-gray transition font-medium text-sm">
                Login
              </Link>
              <Link href="/register" className="px-4 py-2 rounded-lg bg-pure-green text-black hover:bg-pure-accent-light transition font-semibold text-sm">
                Register
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  const navLinkClass = (href: string) =>
    `block px-4 py-2 rounded-lg transition text-pure-white hover:bg-coastal-search/20 ${
      pathname === href ? 'bg-coastal-sky/30 border border-coastal-sky' : ''
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-pure-dark border-b-2 border-coastal-sky shadow-lg">
      <div className="container mx-auto px-4 py-3">
        {/* Top bar */}
        <div className="flex justify-between items-center">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-coastal-sky rounded"
            aria-label="PURE — Dashboard"
          >
            <Image
              src="/go-pure-logo.png"
              alt="PURE"
              width={120}
              height={36}
              className="h-8 w-auto object-contain object-left navbar-brand-spin"
              priority
            />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex gap-1 items-center">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={navLinkClass(href)}>{label}</Link>
            ))}
            {user.is_admin && ADMIN_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={navLinkClass(href)}>{label}</Link>
            ))}
            <Link
              href="/workouts/create"
              className={`bg-pure-green text-black hover:bg-pure-accent-light px-4 py-2 rounded-lg transition font-semibold ml-1 ${
                pathname === '/workouts/create' ? 'ring-2 ring-coastal-sky' : ''
              }`}
            >
              + Create
            </Link>
            <div className="flex items-center gap-3 ml-2 pl-2 border-l border-gray-700">
              <Link href="/profile" className="text-sm text-pure-white font-medium hover:text-coastal-sky transition whitespace-nowrap">
                {user.name}
                {user.is_admin && (
                  <span className="ml-2 bg-coastal-honey text-black text-xs px-2 py-0.5 rounded font-semibold">
                    Admin
                  </span>
                )}
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition text-pure-white font-medium text-sm whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile: right side */}
          <div className="md:hidden flex items-center gap-2">
            <Link href="/profile" className="text-sm text-pure-white font-medium hover:text-coastal-sky transition truncate max-w-[100px]">
              {user.name}
            </Link>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="p-2 rounded-lg border border-gray-600 text-pure-white hover:bg-pure-gray transition"
            >
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden mt-3 pb-1 border-t border-gray-700 pt-3 flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={navLinkClass(href)}>{label}</Link>
            ))}
            {user.is_admin && (
              <>
                <div className="px-4 pt-2 pb-1 text-xs font-semibold text-pure-text-light uppercase tracking-wider">Admin</div>
                {ADMIN_LINKS.map(({ href, label }) => (
                  <Link key={href} href={href} className={navLinkClass(href)}>{label}</Link>
                ))}
              </>
            )}
            <div className="mt-1 pt-2 border-t border-gray-700 flex gap-2">
              <Link
                href="/workouts/create"
                className="flex-1 text-center bg-pure-green text-black hover:bg-pure-accent-light px-4 py-2 rounded-lg transition font-semibold text-sm"
              >
                + Create Workout
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition text-pure-white font-medium text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
