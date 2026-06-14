'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/settings', label: 'General Settings' },
  { href: '/settings/reports', label: 'Report Settings' },
];

export default function SettingsNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/settings') return pathname === '/settings';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 mb-6">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isActive(link.href)
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
