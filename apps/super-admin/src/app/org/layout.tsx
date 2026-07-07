'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { FiGrid, FiHome, FiSettings, FiUsers } from 'react-icons/fi';

const NAV = [
  { href: '/org/dashboard', label: 'Dashboard', icon: FiGrid },
  { href: '/org/schools', label: 'Schools', icon: FiHome },
  { href: '/org/users', label: 'Users', icon: FiUsers },
  { href: '/org/settings', label: 'Subscription', icon: FiSettings },
];

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <DashboardLayout>
      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                active
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={15} />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/admin"
          className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50"
        >
          School ERP →
        </Link>
      </div>
      {children}
    </DashboardLayout>
  );
}
