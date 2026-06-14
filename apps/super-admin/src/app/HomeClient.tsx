'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from '@/features/landing/LandingPage';
import { isClientAuthenticated } from '@/lib/client-auth';

export default function HomeClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = isClientAuthenticated();
    if (token) {
      router.replace('/dashboard');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return <LandingPage />;
}
