'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { FiHome, FiTruck, FiMapPin, FiUsers, FiUserCheck, FiBarChart2 } from 'react-icons/fi';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Transport management overview' },
  '/vehicles': { title: 'Vehicles', subtitle: 'Manage buses, vans, and other vehicles' },
  '/routes': { title: 'Routes', subtitle: 'Manage transport routes and stops' },
  '/drivers': { title: 'Drivers', subtitle: 'Manage driver information and licenses' },
  '/students': { title: 'Students', subtitle: 'View students using transport services' },
  '/assignments': { title: 'Student Assignments', subtitle: 'Assign students to routes' },
  '/reports': { title: 'Reports', subtitle: 'View transport analytics and reports' },
};

export default function Header() {
  const pathname = usePathname();

  // Don't show header on login page
  if (pathname === '/login') {
    return null;
  }

  const pageInfo = pageTitles[pathname] || { title: 'Transport Admin', subtitle: 'Management System' };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div>
          <h1 className="text-xl text-gray-900">{pageInfo.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{pageInfo.subtitle}</p>
        </div>
      </div>
    </header>
  );
}

