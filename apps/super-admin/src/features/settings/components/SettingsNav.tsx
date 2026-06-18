'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const links = [
  { href: '/settings', label: 'General Settings' },
  { href: '/settings?tab=academic', label: 'Academic Year' },
  { href: '/settings/user-access', label: 'User Access' },
  { href: '/settings/staff-access', label: 'Staff Access' },
  { href: '/settings/reports', label: 'Report Settings' },
  { href: '/settings/theme', label: 'Theme Settings' },
];

function navLinkClass(active: boolean) {
  return `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
    active ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  }`;
}

function SettingsNavFallback() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 mb-6">
      {links.map((link) => {
        const basePath = link.href.split('?')[0];
        const active =
          !link.href.includes('?tab=') &&
          (pathname === link.href || (pathname.startsWith(`${basePath}/`) && basePath !== '/settings'));
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

  const isActive = (href: string) => {
    if (href.includes('?tab=')) {
      const tab = href.split('tab=')[1];
      return pathname === '/settings' && searchParams.get('tab') === tab;
    }
    if (href === '/settings') return pathname === '/settings' && !searchParams.get('tab');
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 mb-6">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className={navLinkClass(isActive(link.href))}>
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
