'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { moduleTabBarClass, moduleTabClass } from '@/shared/components/common/ModuleTabs';
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className={moduleTabBarClass}>
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 ${moduleTabClass(active)}`}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50"
        >
          School ERP
        </Link>
      </div>
      {children}
    </DashboardLayout>
  );
}
