'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/inventory', label: 'Dashboard', exact: true },
  { href: '/inventory/items', label: 'Masters' },
  { href: '/inventory/purchase-requests', label: 'Procurement' },
  { href: '/inventory/issue', label: 'Stock' },
  { href: '/inventory/assets', label: 'Assets' },
  { href: '/inventory/barcode', label: 'Barcode' },
  { href: '/inventory/reports', label: 'Reports' },
  { href: '/inventory/audit', label: 'Audit' },
];

const MASTER_PREFIXES = ['/inventory/items', '/inventory/categories', '/inventory/units', '/inventory/vendors', '/inventory/locations'];
const PROCURE_PREFIXES = ['/inventory/purchase-requests', '/inventory/purchase-orders', '/inventory/grn'];
const STOCK_PREFIXES = [
  '/inventory/stock-move',
  '/inventory/issue',
  '/inventory/return',
  '/inventory/transfer',
  '/inventory/adjustment',
  '/inventory/stock',
  '/inventory/ledger',
  '/inventory/alerts',
  '/inventory/verification',
];

function matches(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === '/inventory/items') return MASTER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (href === '/inventory/purchase-requests') return PROCURE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (href === '/inventory/issue') return STOCK_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function InventoryModuleLinks() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const active = matches(pathname, link.href, link.exact);
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
