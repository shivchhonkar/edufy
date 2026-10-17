'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { moduleTabBarClass, moduleTabClass } from '@/shared/components/common/ModuleTabs';

const LINKS = [
  { href: '/inventory', label: 'Dashboard', exact: true },
  { href: '/inventory/items', label: 'Masters' },
  { href: '/inventory/purchase-requests', label: 'Purchase' },
  { href: '/inventory/issue', label: 'Issue / Sell' },
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
    <div className={moduleTabBarClass}>
      {LINKS.map((link) => {
        const active = matches(pathname, link.href, link.exact);
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
