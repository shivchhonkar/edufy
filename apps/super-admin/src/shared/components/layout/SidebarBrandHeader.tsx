'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import AppLogo from '@/shared/components/common/AppLogo';
import SchoolSwitcherMenu from '@/shared/components/layout/SchoolSwitcherMenu';
import { useSchoolSwitchSession } from '@/hooks/use-school-switch-session';
import { getClientUser } from '@/lib/client-auth';
import { FiChevronDown, FiChevronsLeft, FiMenu } from 'react-icons/fi';
import { useMemo } from 'react';

interface SidebarBrandHeaderProps {
  schoolName: string;
  schoolLogo?: string;
  homeHref: string;
  collapsed: boolean;
  onToggle: () => void;
}

function resolveSidebarSchoolLabel(schoolName: string, session: ReturnType<typeof useSchoolSwitchSession>['session']) {
  const trimmedName = schoolName.trim();
  if (trimmedName && trimmedName !== 'School CRM') {
    return trimmedName;
  }

  const user = getClientUser();
  const slug =
    session?.activeSchool?.slug ??
    (user?.school_slug != null
      ? String(user.school_slug)
      : user?.tenant_slug != null
        ? String(user.tenant_slug)
        : '');

  return slug || trimmedName || 'School';
}

export default function SidebarBrandHeader({
  schoolName,
  schoolLogo,
  homeHref,
  collapsed,
  onToggle,
}: SidebarBrandHeaderProps) {
  const {
    session,
    canSwitch,
    open,
    switching,
    switchError,
    coords,
    containerRef,
    triggerRef,
    menuRef,
    toggleMenu,
    handleSwitch,
    goToOrgDashboard,
  } = useSchoolSwitchSession();

  const displayName = useMemo(
    () => resolveSidebarSchoolLabel(schoolName, session),
    [schoolName, session],
  );
  const truncatedName = displayName.length > 48 ? `${displayName.slice(0, 48)}...` : displayName;

  const menuPortal =
    open && canSwitch && session && typeof document !== 'undefined'
      ? createPortal(
          <SchoolSwitcherMenu
            session={session}
            active={session.activeSchool}
            switchError={switchError}
            switching={switching}
            onSwitch={handleSwitch}
            onOrgDashboard={goToOrgDashboard}
            menuRef={menuRef}
            style={{
              top: coords.top,
              left: coords.left,
              width: collapsed ? 256 : coords.width,
            }}
          />,
          document.body,
        )
      : null;

  const logoNode = (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
      <AppLogo variant={collapsed ? 'sidebar-collapsed' : 'sidebar'} src={schoolLogo} alt={displayName} />
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`border-b border-gray-200 ${collapsed ? 'px-2 py-2.5' : 'px-3 py-2.5'}`}
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-2">
          {canSwitch ? (
            <button
              ref={triggerRef as React.RefObject<HTMLButtonElement>}
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label={`Switch school (${displayName})`}
              title={`${displayName} — click to switch school`}
              disabled={switching}
              onClick={() => toggleMenu(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50/40"
            >
              <AppLogo variant="sidebar-collapsed" src={schoolLogo} alt={displayName} />
            </button>
          ) : (
            <Link
              href={homeHref}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50/40"
              title={displayName}
            >
              <AppLogo variant="sidebar-collapsed" src={schoolLogo} alt={displayName} />
            </Link>
          )}
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
          {canSwitch ? (
            <button
              ref={triggerRef as React.RefObject<HTMLButtonElement>}
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label={`Switch school (${displayName})`}
              disabled={switching}
              onClick={() => toggleMenu(false)}
              className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg p-1 -m-1 text-left transition-colors hover:bg-white/10"
            >
              {logoNode}
              <span className="min-w-0 flex-1 truncate text-[13px] leading-tight" title={displayName}>
                {truncatedName}
              </span>
              <FiChevronDown
                size={14}
                className={`shrink-0 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
          ) : (
            <Link
              href={homeHref}
              className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg p-1 -m-1 transition-colors hover:bg-white/80"
              title={displayName}
            >
              {logoNode}
              <p
                className="truncate text-[13px] leading-tight text-gray-900"
                title={displayName}
              >
                {truncatedName}
              </p>
            </Link>
          )}
          {/* <button
            type="button"
            onClick={onToggle}
            className="hidden lg:flex shrink-0 rounded-md p-1 transition-colors hover:bg-gray-100"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <FiChevronsLeft size={16} className="text-primary-600" />
          </button> */}
        </div>
      )}

      {menuPortal}
    </div>
  );
}
