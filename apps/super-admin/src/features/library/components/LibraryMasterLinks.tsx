'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
    <div className="flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              active ? 'bg-primary-600 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
