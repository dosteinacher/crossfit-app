'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { SessionUser } from '@/lib/types';

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

const MOBILE_LINKS = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/workouts', label: 'Workouts', icon: 'workouts' },
  { href: '/calendar', label: 'Calendar', icon: 'calendar' },
] as const;

function initialsFor(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function NavIcon({ kind }: { kind: 'home' | 'workouts' | 'calendar' | 'profile' }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    workouts: <><path d="M4 7h16M4 12h16M4 17h16" /><path d="M7 4v16M17 4v16" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2Z" /></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      {paths[kind]}
    </svg>
  );
}

export default function Navbar({ photoHero = false }: { photoHero?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminOpenPath, setAdminOpenPath] = useState<string | null>(null);
  const [profileOpenPath, setProfileOpenPath] = useState<string | null>(null);
  const adminOpen = adminOpenPath === pathname;
  const profileOpen = profileOpenPath === pathname;

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setUser(data.user); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    router.push('/login');
  };

  if (loading) return null;

  if (!user) {
    return (
      <nav className={`${photoHero ? 'absolute inset-x-0 top-0 z-50 border-transparent bg-transparent md:sticky md:top-0 md:border-b md:border-line md:bg-paper' : 'sticky top-0 border-b border-line bg-paper'} z-50`}>
        <div className="mx-auto flex h-[52px] max-w-[1120px] items-center justify-between px-4 md:h-[68px]">
          <Link href="/login" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15" aria-label="GO PURE — Login">
            <Image src="/go-pure-logo-dark.png" alt="" width={96} height={30} className="h-7 w-auto object-contain object-left" priority />
            <span className="font-display text-2xl font-extrabold text-ink">PURE</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="inline-flex min-h-10 items-center rounded-sm border border-line px-3 text-sm font-semibold text-ink hover:bg-canvas">Login</Link>
            <Link href="/register" className="inline-flex min-h-10 items-center rounded-sm bg-lime px-3 text-sm font-bold text-ink hover:brightness-95">Register</Link>
          </div>
        </div>
      </nav>
    );
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const navLinkClass = (active: boolean) =>
    `inline-flex min-h-10 items-center whitespace-nowrap rounded-[8px] px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15 ${
      active ? 'bg-ink text-white' : 'text-ink-2 hover:bg-canvas hover:text-ink'
    }`;
  const initials = initialsFor(user.name);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-line bg-paper">
        <div className="mx-auto flex h-[52px] max-w-[1120px] items-center justify-between px-4 md:h-[68px]">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15"
            aria-label="PURE — Dashboard"
          >
            <Image src={photoHero ? '/go-pure-logo.png' : '/go-pure-logo-dark.png'} alt="" width={96} height={30} className="h-7 w-auto object-contain object-left md:h-8" priority />
            <span className={`font-display text-2xl font-extrabold ${photoHero ? 'text-white md:text-ink' : 'text-ink'}`}>PURE</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={navLinkClass(isActive(href))}>{label}</Link>
            ))}
            {user.is_admin && (
              <div className="relative ml-1 border-l border-line pl-2">
                <button
                  type="button"
                  onClick={() => setAdminOpenPath(adminOpen ? null : pathname)}
                  aria-expanded={adminOpen}
                  className={navLinkClass(pathname.startsWith('/admin'))}
                >
                  Admin <span aria-hidden="true" className="ml-1">▾</span>
                </button>
                {adminOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 min-w-44 rounded-lg border border-line bg-paper p-1 shadow-card">
                    {ADMIN_LINKS.map(({ href, label }) => (
                      <Link key={href} href={href} className={`block rounded-md px-3 py-2.5 text-sm font-semibold ${isActive(href) ? 'bg-canvas text-ink' : 'text-ink-2 hover:bg-canvas hover:text-ink'}`}>
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {user.is_admin && (
              <Link href="/workouts/create" className="inline-flex min-h-11 items-center rounded-sm bg-lime px-4 text-sm font-bold text-ink hover:brightness-95">
                + New workout
              </Link>
            )}
            <div className="relative border-l border-line pl-3">
              <button
                type="button"
                onClick={() => setProfileOpenPath(profileOpen ? null : pathname)}
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-bold text-lime focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15"
              >
                {initials}
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-line bg-paper p-2 shadow-card">
                  <div className="border-b border-line-2 px-3 py-2">
                    <div className="font-semibold text-ink">{user.name}</div>
                    <div className="mt-1 text-sm text-ink-2">{user.is_admin ? 'Admin' : 'Member'}</div>
                  </div>
                  <Link href="/profile" className="mt-1 block rounded-md px-3 py-2.5 text-sm font-semibold text-ink-2 hover:bg-canvas hover:text-ink">Profile</Link>
                  <button type="button" onClick={handleLogout} className="block min-h-11 w-full rounded-md px-3 py-2.5 text-left text-sm font-bold text-danger hover:bg-canvas">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          <Link href="/profile" className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15 md:hidden ${photoHero ? 'bg-white/95 text-ink' : 'bg-ink text-lime'}`} aria-label="Profile">
            {initials}
          </Link>
        </div>
      </nav>

      <nav className="app-mobile-tabs fixed inset-x-0 bottom-0 z-50 flex h-[calc(80px+env(safe-area-inset-bottom))] items-stretch justify-around border-t border-line bg-paper px-2 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main navigation">
        {MOBILE_LINKS.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined} className="flex min-w-0 flex-1 flex-col items-center justify-start pt-2 text-[13px] font-semibold text-ink-2">
              <span className={`mb-1 h-1 w-[22px] rounded-full ${active ? 'bg-ink' : 'bg-transparent'}`} />
              <NavIcon kind={icon} />
              <span className="mt-1 whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
        <div className="relative flex min-w-0 flex-1 justify-center">
          {profileOpen && (
            <div className="absolute bottom-[calc(100%+8px)] right-0 z-50 w-52 rounded-lg border border-line bg-paper p-2 shadow-card">
              <div className="border-b border-line-2 px-3 py-2">
                <div className="font-semibold text-ink">{user.name}</div>
                <div className="mt-1 text-sm text-ink-2">{user.is_admin ? 'Admin' : 'Member'}</div>
              </div>
              <Link href="/profile" className="mt-1 block rounded-md px-3 py-2.5 text-sm font-semibold text-ink-2 hover:bg-canvas">Profile</Link>
              <Link href="/guidelines" className="block rounded-md px-3 py-2.5 text-sm font-semibold text-ink-2 hover:bg-canvas">Guidelines</Link>
              {user.is_admin && ADMIN_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className="block rounded-md px-3 py-2.5 text-sm font-semibold text-ink-2 hover:bg-canvas">{label}</Link>
              ))}
              <button type="button" onClick={handleLogout} className="block min-h-11 w-full rounded-md px-3 py-2.5 text-left text-sm font-bold text-danger hover:bg-canvas">Logout</button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setProfileOpenPath(profileOpen ? null : pathname)}
            aria-expanded={profileOpen}
            className="flex w-full flex-col items-center justify-start pt-2 text-[13px] font-semibold text-ink-2"
          >
            <span className={`mb-1 h-1 w-[22px] rounded-full ${isActive('/profile') || profileOpen ? 'bg-ink' : 'bg-transparent'}`} />
            <NavIcon kind="profile" />
            <span className="mt-1 whitespace-nowrap">Profile</span>
          </button>
        </div>
      </nav>

      {user.is_admin && (
        <Link
          href="/workouts/create"
          aria-label="Create workout"
          className="fixed bottom-[calc(80px+env(safe-area-inset-bottom)+12px)] right-4 z-40 inline-flex h-[58px] w-[58px] items-center justify-center rounded-full bg-lime text-4xl font-normal leading-none text-ink shadow-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/25 md:hidden"
        >
          +
        </Link>
      )}
    </>
  );
}
