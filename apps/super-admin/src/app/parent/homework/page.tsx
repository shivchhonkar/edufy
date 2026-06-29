'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { parentRoute } from '@/lib/parent-portal/constants';

function ParentChildRedirect({ segment }: { segment: string }) {
  const router = useRouter();

  useEffect(() => {
    const childId = localStorage.getItem('selectedChildId');
    if (childId) {
      router.replace(parentRoute(`/${segment}/${childId}`));
    } else {
      router.replace('/parent');
    }
  }, [router, segment]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="portal-spinner animate-spin rounded-full h-10 w-10 border-2 border-t-transparent" />
    </div>
  );
}

export default function ParentHomeworkRedirectPage() {
  return <ParentChildRedirect segment="homework" />;
}
