'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/hr/dashboard', label: 'Dashboard' },
];

export default function HrNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 mb-6">
      {links.length>0&&links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            pathname === link.href || pathname.startsWith(`${link.href}/`)
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
