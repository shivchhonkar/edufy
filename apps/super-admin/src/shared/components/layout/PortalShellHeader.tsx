'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiLogOut, FiMenu } from 'react-icons/fi';
import { getTimeOfDayGreeting } from '@edulakhya/utils';
import {
  clearClientSession,
  getClientUser,
  getClientUserRole,
} from '@/lib/client-auth';
import type { PortalId } from '@/lib/role-routing';
import { PORTAL_TITLES } from '@/shared/navigation/portal-navigation';
import {
  formatPortalHeaderDate,
  formatPortalRole,
  getPortalUserInitials,
  resolvePortalDisplayName,
} from '@/lib/portal-user-display';

interface PortalShellHeaderProps {
  portalId: PortalId;
  onMenuClick?: () => void;
}

export default function PortalShellHeader({ portalId, onMenuClick }: PortalShellHeaderProps) {
  const profileRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState('Welcome');
  const [profileOpen, setProfileOpen] = useState(false);

  const refreshUser = useCallback(() => {
    setUser(getClientUser());
    setUserRole(getClientUserRole());
    setSelectedChildId(localStorage.getItem('selectedChildId'));
  }, []);

  useEffect(() => {
    refreshUser();
    setMounted(true);
  }, [refreshUser]);

  useEffect(() => {
    if (!mounted) return;

    const refreshGreeting = () => setGreeting(getTimeOfDayGreeting());
    refreshGreeting();

    const intervalId = window.setInterval(refreshGreeting, 60_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshGreeting();
    };
    const onChildSelected = () => refreshUser();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('childSelected', onChildSelected);
    window.addEventListener('storage', onChildSelected);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('childSelected', onChildSelected);
      window.removeEventListener('storage', onChildSelected);
    };
  }, [mounted, refreshUser]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };

    const onClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  const displayName = resolvePortalDisplayName(user, userRole, selectedChildId);
  const welcomeText = mounted ? `${greeting}, ${displayName}` : `Welcome, ${displayName}`;
  const displayRole = userRole ? formatPortalRole(userRole) : PORTAL_TITLES[portalId];

  const handleLogout = () => {
    clearClientSession();
    window.location.href = '/login';
  };

  const handleSidebarToggle = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onMenuClick?.();
      return;
    }
    window.dispatchEvent(new CustomEvent('sidebar-toggle-request'));
  }, [onMenuClick]);

  return (
    <header className="theme-header border-b border-gray-200/80 px-4 sm:px-6 py-1.5 sm:py-2 shrink-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 shrink items-center gap-2">
          <button
            type="button"
            onClick={handleSidebarToggle}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
            aria-label="Toggle sidebar"
          >
            <FiMenu className="h-4 w-4" />
          </button>
          <div className="min-w-0 shrink max-w-[min(42vw,9rem)] sm:max-w-[12rem] md:max-w-[14rem] lg:max-w-[15rem] xl:max-w-[17rem]">
            <h1
              className="flex min-w-0 items-center text-sm font-semibold leading-tight text-gray-900"
              title={welcomeText}
            >
              <span className="truncate">{welcomeText}</span>
            </h1>
            <p
              className="truncate text-[10px] leading-tight text-gray-500"
              suppressHydrationWarning
            >
              {mounted ? formatPortalHeaderDate(new Date()) : 'Loading date...'}
            </p>
          </div>
        </div>

        <div ref={profileRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="flex items-center gap-1.5 sm:gap-2 rounded-lg py-0.5 pl-0.5 pr-1.5 sm:pr-2 transition-colors hover:bg-white/70"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white ring-2 ring-white shadow-sm">
              {getPortalUserInitials(displayName)}
            </div>
            <div className="hidden min-w-0 max-w-[8rem] sm:block text-left">
              <p
                className="truncate text-xs font-semibold text-gray-900 leading-tight"
                title={displayName}
              >
                {displayName}
              </p>
              <p className="truncate text-[10px] leading-tight text-gray-500" title={displayRole}>
                {displayRole}
              </p>
            </div>
            <FiChevronDown
              className={`hidden sm:block h-3.5 w-3.5 text-gray-400 transition-transform ${
                profileOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[210px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
            >
              <div className="border-b border-gray-100 px-4 py-3 sm:hidden">
                <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500">{displayRole}</p>
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <FiLogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
