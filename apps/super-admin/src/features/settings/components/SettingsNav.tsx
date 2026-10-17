'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { moduleTabBarClass, moduleTabClass } from '@/shared/components/common/ModuleTabs';

/** Horizontal nav shared across all settings pages — kept in sync with Settings sidebar group. */
export const SETTINGS_NAV_LINKS = [
  { href: '/settings/setup', label: 'School Setup' },
  { href: '/settings/student-lookups', label: 'Student Master Data' },
  { href: '/settings/holidays', label: 'Holidays' },
  { href: '/settings/working-days', label: 'Working Days' },
  { href: '/settings/age-restrictions', label: 'Age Restrictions' },
  { href: '/settings', label: 'System Settings' },
  { href: '/settings/user-access', label: 'Parent Portal' },
  { href: '/settings/staff-access', label: 'Staff Portal' },
  { href: '/settings/reports', label: 'Report Settings' },
  { href: '/settings/theme', label: 'Theme' },
  { href: '/settings/payment', label: 'Payment Gateway' },
] as const;

function navLinkClass(active: boolean) {
  return moduleTabClass(active);
}

function isSettingsNavActive(pathname: string, searchParams: URLSearchParams | null, href: string) {
  if (href === '/settings') {
    return pathname === '/settings' && !searchParams?.get('tab');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SettingsNavFallback() {
  const pathname = usePathname();

  return (
    <div className={moduleTabBarClass}>
      {SETTINGS_NAV_LINKS.map((link) => {
        const basePath = link.href.split('?')[0];
        const active = pathname === link.href || pathname.startsWith(`${basePath}/`);
        return (
          <Link key={link.href} href={link.href} className={navLinkClass(active)}>
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

function SettingsNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className={moduleTabBarClass}>
      {SETTINGS_NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={navLinkClass(isSettingsNavActive(pathname, searchParams, link.href))}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export default function SettingsNav() {
  return (
    <Suspense fallback={<SettingsNavFallback />}>
      <SettingsNavInner />
    </Suspense>
  );
}
