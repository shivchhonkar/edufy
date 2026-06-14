'use client';

import { useEffect, useState } from 'react';
import { FiBell, FiUser, FiLogOut } from 'react-icons/fi';
import { getClientUser, clearClientSession } from '@/lib/client-auth';

export default function Header() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setUser(getClientUser());
  }, []);

  const handleLogout = () => {
    clearClientSession();
    window.location.href = '/login';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-4">
      <div>
        <h2 className="text-xl text-gray-800">Welcome back!</h2>
        <p className="text-sm text-gray-600">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="flex items-center space-x-4">
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <FiBell className="w-6 h-6" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center space-x-3 border-l pl-4 border-gray-200">
          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
            <FiUser className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">
              {(user?.full_name as string) || 'Admin'}
            </p>
            <p className="text-xs text-gray-600">
              {((user?.role as string) || 'Administrator').replace(/_/g, ' ')}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-3 flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <FiLogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
