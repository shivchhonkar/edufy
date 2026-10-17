'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { moduleTabBarClass, moduleTabClass } from '@/shared/components/common/ModuleTabs';

const LINKS = [
  { href: '/fees/setup', label: 'Class-wise', exact: true },
  { href: '/fees/setup/series', label: 'Series' },
  { href: '/fees/setup/categories', label: 'Fee Heads' },
  { href: '/fees/setup/category-wise', label: 'Category-wise' },
  { href: '/fees/setup/student-wise', label: 'Student-wise' },
  { href: '/fees/setup/structures', label: 'Structures' },
];

export default function FeeSetupLinks() {
  const pathname = usePathname();
  return (
    <div className={moduleTabBarClass}>
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
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
