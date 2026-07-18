'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlatformLoginFlow from '@/features/auth/components/PlatformLoginFlow';
import { isPlatformLoginHost } from '@/lib/platform-login';

export default function StudentLoginPage() {
  const router = useRouter();
  const [hostKind, setHostKind] = useState<'pending' | 'platform' | 'tenant'>('pending');

  useEffect(() => {
    if (isPlatformLoginHost()) {
      setHostKind('platform');
      return;
    }
    router.replace('/login');
  }, [router]);

  if (hostKind === 'pending' || hostKind === 'tenant') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  return <PlatformLoginFlow portal="student" />;
}
