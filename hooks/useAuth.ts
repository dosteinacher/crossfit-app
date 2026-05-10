'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionUser } from '@/lib/types';

export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setUser(data.user);
        setLoading(false);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  return { user, loading };
}
