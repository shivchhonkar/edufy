'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useMemo } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import AppLogo from '@/shared/components/common/AppLogo';
import SchoolSwitcherMenu from '@/shared/components/layout/SchoolSwitcherMenu';
import { resolveSchoolDisplayLabel } from '@/shared/components/layout/school-display-label';
import { useSchoolSwitchSession } from '@/hooks/use-school-switch-session';

interface HeaderSchoolBrandProps {
  schoolName: string;
  schoolLogo?: string;
  homeHref?: string;
}

export default function HeaderSchoolBrand({
  schoolName,
  schoolLogo,
  homeHref = '/admin',
}: HeaderSchoolBrandProps) {
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
    () => resolveSchoolDisplayLabel(schoolName, session),
    [schoolName, session],
  );

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
              width: Math.max(coords.width, 240),
            }}
          />,
          document.body,
        )
      : null;

  const logoNode = (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200/80 bg-white p-0.5">
      <AppLogo variant="sidebar-collapsed" src={schoolLogo} alt={displayName} />
    </div>
  );

  const labelNode = (
    <span className="theme-header-title max-w-[7rem] truncate text-sm font-semibold sm:max-w-[9rem] xl:max-w-[12rem]">
      {displayName}
    </span>
  );

  return (
    <div ref={containerRef} className="relative shrink-0">
      {canSwitch ? (
        <button
          ref={triggerRef as React.RefObject<HTMLButtonElement>}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Switch school (${displayName})`}
          disabled={switching}
          onClick={() => toggleMenu(false)}
          className="theme-header-school flex max-w-[11rem] items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors sm:max-w-[14rem] xl:max-w-[16rem]"
        >
          {logoNode}
          {labelNode}
          <FiChevronDown
            size={14}
            className={`shrink-0 opacity-80 transition-transform [color:var(--theme-header-muted)] ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      ) : (
        <Link
          href={homeHref}
          className="theme-header-school flex max-w-[14rem] items-center gap-2 rounded-lg px-1 py-1 transition-colors xl:max-w-[16rem]"
          title={displayName}
        >
          {logoNode}
          {labelNode}
        </Link>
      )}
      {menuPortal}
    </div>
  );
}
