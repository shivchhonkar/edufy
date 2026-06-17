'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Don't check auth on login page
    if (pathname === '/login') {
      setIsChecking(false);
      return;
    }

    // Check if user is authenticated
    const checkAuth = () => {
      if (!isAuthenticated()) {
        router.push('/login');
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  // Show loading on protected pages while checking auth
  if (isChecking && pathname !== '/login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


























































