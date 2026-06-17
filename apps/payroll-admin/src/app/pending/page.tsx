'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function PendingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/reports?type=outstanding');
  }, [router]);
  return (
    <div className="p-6 text-center text-gray-500 text-sm">Loading pending dues report...</div>
  );
}

export default function PendingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading...</div>}>
      <PendingRedirect />
    </Suspense>
  );
}
