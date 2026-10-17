'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { moduleTabBarClass, moduleTabClass } from '@/shared/components/common/ModuleTabs';

const LINKS = [
  { href: '/library', label: 'Dashboard', match: '/library', exact: true },
  { href: '/library/masters', label: 'Masters', match: '/library/masters' },
  { href: '/library/circulation', label: 'Circulation', match: '/library/circulation' },
  { href: '/library/registers', label: 'Registers', match: '/library/registers' },
  { href: '/library/fines', label: 'Fines', match: '/library/fines' },
  { href: '/library/reports', label: 'Reports', match: '/library/reports' },
];

const CIRCULATION_PATHS = ['/library/students/', '/library/staff/'];
const REGISTER_PATHS = [
  '/library/reports/books',
  '/library/reports/issue-return',
  '/library/reports/issued',
  '/library/registers',
];

function pathMatches(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function isActive(pathname: string, href: string, match: string, exact?: boolean) {
  if (exact) return pathname === match;
  if (href === '/library/masters') {
    return pathMatches(pathname, '/library/masters') || pathMatches(pathname, '/library/catalog');
  }
  if (href === '/library/circulation') {
    return pathMatches(pathname, match) || CIRCULATION_PATHS.some((p) => pathname.startsWith(p));
  }
  if (href === '/library/registers') {
    return REGISTER_PATHS.some((p) => pathMatches(pathname, p));
  }
  if (href === '/library/reports') {
    if (REGISTER_PATHS.some((p) => p !== '/library/registers' && pathMatches(pathname, p))) {
      return false;
    }
    return pathMatches(pathname, match);
  }
  return pathMatches(pathname, match);
}

export default function LibraryModuleLinks() {
  const pathname = usePathname();
  return (
    <div className={moduleTabBarClass}>
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href, link.match, link.exact);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={moduleTabClass(active)}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
