'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { moduleTabBarClass, moduleTabClass } from '@/shared/components/common/ModuleTabs';

const links = [
  { href: '/hr/dashboard', label: 'Dashboard' },
];

export default function HrNav() {
  const pathname = usePathname();
  return (
    <div className={moduleTabBarClass}>
      {links.length>0&&links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={moduleTabClass(pathname === link.href || pathname.startsWith(`${link.href}/`))}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
