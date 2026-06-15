'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@edulakhya/ui';
import { FiHome } from 'react-icons/fi';

interface HeaderProps {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  showDashboard?: boolean;
}

export default function Header({ title, subtitle, actions, showDashboard = true }: HeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'token=; path=/; max-age=0';
    window.location.href = '/login';
  };

  const getUser = () => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  };

  const user = getUser();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl text-gray-900">{title}</h1>
            <p className="text-sm text-gray-600">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {showDashboard && (
              <Link href="/">
                <Button variant="outline">
                  <FiHome className="mr-2" />
                  Dashboard
                </Button>
              </Link>
            )}
            {actions}
            <div className="flex items-center gap-4 ml-4 pl-4 border-l">
              {user && (
                <span className="text-sm text-gray-600 hidden sm:block">
                  {user.full_name}
                </span>
              )}
              <button 
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}


























































