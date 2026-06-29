'use client';

import Link from 'next/link';
import AppLogo from '@/shared/components/common/AppLogo';
import { FiChevronsLeft, FiMenu } from 'react-icons/fi';

interface SidebarBrandHeaderProps {
  schoolName: string;
  schoolLogo?: string;
  homeHref: string;
  collapsed: boolean;
  onToggle: () => void;
}

export default function SidebarBrandHeader({
  schoolName,
  schoolLogo,
  homeHref,
  collapsed,
  onToggle,
}: SidebarBrandHeaderProps) {
  const displayName = schoolName.length > 48 ? `${schoolName.slice(0, 48)}...` : schoolName;

  return (
    <div className={`border-b border-gray-200 ${collapsed ? 'px-2 py-2.5' : 'px-3 py-2.5'}`}>
      {collapsed ? (
        <div className="flex flex-col items-center gap-2">
          <Link
            href={homeHref}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50/40"
            title={schoolName}
          >
            <AppLogo variant="sidebar-collapsed" src={schoolLogo} alt={schoolName} />
          </Link>
          <button
            type="button"
            onClick={onToggle}
            className="hidden lg:block rounded-md p-1 hover:bg-gray-100 transition-colors"
            title="Expand menu"
            aria-label="Expand menu"
          >
            <FiMenu size={16} className="text-primary-600" />
          </button>
        </div>
      ) : (
        <div className="flex min-w-0 items-center justify-between gap-1.5">
          <Link
            href={homeHref}
            className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg p-1 -m-1 transition-colors hover:bg-white/80"
            title={schoolName}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
              <AppLogo variant="sidebar" src={schoolLogo} alt={schoolName} />
            </div>
            <p
              className="truncate text-[11px] font-semibold leading-tight text-gray-900"
              title={schoolName}
            >
              {displayName}
            </p>
          </Link>
          <button
            type="button"
            onClick={onToggle}
            className="hidden lg:flex shrink-0 rounded-md p-1 transition-colors hover:bg-gray-100"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <FiChevronsLeft size={16} className="text-primary-600" />
          </button>
        </div>
      )}
    </div>
  );
}
