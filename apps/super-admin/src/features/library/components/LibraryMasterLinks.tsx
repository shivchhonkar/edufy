'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { moduleTabBarClass, moduleTabClass } from '@/shared/components/common/ModuleTabs';

const LINKS = [
  { href: '/library/catalog/books', label: 'Books' },
  { href: '/library/masters/authors', label: 'Authors' },
  { href: '/library/masters/publishers', label: 'Publishers' },
  { href: '/library/masters/subjects', label: 'Subjects' },
  { href: '/library/masters/vendors', label: 'Vendors' },
  { href: '/library/masters/racks', label: 'Racks & Shelves' },
  { href: '/library/masters/fines', label: 'Fine Rules' },
  { href: '/library/masters/categories', label: 'Categories' },
];

export default function LibraryMasterLinks() {
  const pathname = usePathname();
  return (
    <div className={moduleTabBarClass}>
      {LINKS.map((link) => {
        const active = pathname === link.href;
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
