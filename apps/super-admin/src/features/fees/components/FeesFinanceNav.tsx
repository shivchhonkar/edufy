'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  FEES_MAIN_NAV,
  FEES_REPORTS_NAV,
  FEES_SETUP_NAV,
  isFeesNavActive,
} from '@/features/fees/navigation/fees-finance-nav';

function SubNav({
  items,
  pathname,
  searchParams,
}: {
  items: typeof FEES_SETUP_NAV;
  pathname: string;
  searchParams: URLSearchParams;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-t border-gray-100 pt-2 mt-2">
      {items.map((item) => {
        const [basePath, query = ''] = item.path.split('?');
        const itemType = new URLSearchParams(query).get('type');
        const currentType = searchParams.get('type') || 'collection';
        const isActive = item.exact
          ? pathname === basePath
          : pathname === basePath && (itemType ? itemType === currentType : !itemType);

        return (
          <Link
            key={item.path}
            href={item.path}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-primary-100 text-primary-800 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <item.icon size={14} aria-hidden />
            {item.name}
          </Link>
        );
      })}
    </div>
  );
}

function FeesFinanceNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showSetupSub = pathname.startsWith('/fees/setup');
  const showReportsSub = pathname.startsWith('/fees/reports');

  return (
    <nav
      className="bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-2 mb-6"
      aria-label="Fees and finance"
    >
      <div className="flex flex-wrap gap-1">
        {FEES_MAIN_NAV.map((item) => {
          const active = isFeesNavActive(pathname, item);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-primary-600 text-white font-medium shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <item.icon size={15} aria-hidden />
              <span>{item.name}</span>
              {item.shortcut && (
                <kbd
                  className={`hidden sm:inline text-[10px] px-1 py-0.5 rounded ${
                    active ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {item.shortcut}
                </kbd>
              )}
            </Link>
          );
        })}
      </div>
      {showSetupSub && (
        <SubNav items={FEES_SETUP_NAV} pathname={pathname} searchParams={searchParams} />
      )}
      {showReportsSub && (
        <SubNav items={FEES_REPORTS_NAV} pathname={pathname} searchParams={searchParams} />
      )}
    </nav>
  );
}

function FeesFinanceNavFallback() {
  const pathname = usePathname();

  return (
    <nav
      className="bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-2 mb-6"
      aria-label="Fees and finance"
    >
      <div className="flex flex-wrap gap-1">
        {FEES_MAIN_NAV.map((item) => {
          const active = isFeesNavActive(pathname, item);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-primary-600 text-white font-medium shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon size={15} aria-hidden />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function FeesFinanceNav() {
  return (
    <Suspense fallback={<FeesFinanceNavFallback />}>
      <FeesFinanceNavInner />
    </Suspense>
  );
}
