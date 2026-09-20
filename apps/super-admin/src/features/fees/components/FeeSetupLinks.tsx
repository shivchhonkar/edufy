'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
    <div className="flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
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
