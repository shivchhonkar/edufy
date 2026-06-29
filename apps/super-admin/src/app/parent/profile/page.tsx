'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { parentRoute } from '@/lib/parent-portal/constants';

export default function ParentProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const childId = localStorage.getItem('selectedChildId');
    if (childId) {
      router.replace(parentRoute(`/profile/${childId}`));
    } else {
      router.replace('/parent');
    }
  }, [router]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="portal-spinner animate-spin rounded-full h-10 w-10 border-2 border-t-transparent" />
    </div>
  );
}
