'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import AppLogo from '@/shared/components/common/AppLogo';
import { SIDEBAR_COLLAPSED_CLASS, SIDEBAR_EXPANDED_CLASS } from '@/shared/constants/sidebar';
import { useSettings } from '@/shared/SettingsContext';
import {
  SIDEBAR_NAV_GROUPS,
  getInitialExpandedGroups,
  isNavLinkActive,
} from '@/shared/navigation/sidebar-navigation';
import {
  FiMenu,
  FiChevronsLeft,
  FiChevronDown,
  FiChevronRight,
} from 'react-icons/fi';
import type { PortalSidebarProps } from '@edulakhya/ui';

interface SidebarProps extends PortalSidebarProps {
  onToggle?: (collapsed: boolean) => void;
}

export default function Sidebar({ onToggle, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { settings } = useSettings();
  const schoolLogo = settings.logo_url;
  const schoolName = settings.school_name?.trim() || 'School CRM';

  const initialCollapsedState = useMemo(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarCollapsed');
      if (savedState === null) {
        localStorage.setItem('sidebarCollapsed', 'false');
        return false;
      }
      return savedState === 'true';
    }
    return false;
  }, []);

  const [isCollapsed, setIsCollapsed] = useState(initialCollapsedState);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    getInitialExpandedGroups(pathname)
  );

  useEffect(() => {
    const activeGroup = SIDEBAR_NAV_GROUPS.find((group) =>
      group.items.some((item) => isNavLinkActive(pathname, item.path))
    );
    if (activeGroup) {
      setExpandedGroups((prev) => ({ ...prev, [activeGroup.id]: true }));
    }
  }, [pathname]);

  useEffect(() => {
    if (onToggle) {
      onToggle(isCollapsed);
    }
    window.dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: isCollapsed }));
  }, [isCollapsed, onToggle]);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
    window.dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: newState }));
    onToggle?.(newState);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const isGroupActive = (groupId: string) => {
    const group = SIDEBAR_NAV_GROUPS.find((g) => g.id === groupId);
    return group?.items.some((item) => isNavLinkActive(pathname, item.path)) ?? false;
  };

  const displayCollapsed = isCollapsed && !mobileOpen;

  return (
    <div
      className={`sidebar-container flex-shrink-0 h-full bg-gray-50 border-r border-gray-200 text-gray-700 overflow-y-auto transition-transform duration-300 z-50 text-sm shadow-sm fixed inset-y-0 left-0 lg:relative ${
        displayCollapsed ? SIDEBAR_COLLAPSED_CLASS : SIDEBAR_EXPANDED_CLASS
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      <div className={`border-b border-gray-200 ${displayCollapsed ? 'px-3 py-4' : 'px-4 py-4'}`}>
        {displayCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50/40"
              title={schoolName}
            >
              <AppLogo variant="sidebar-collapsed" src={schoolLogo} alt={schoolName} />
            </Link>
            <button
              onClick={toggleSidebar}
              className="hidden lg:block p-1.5 hover:bg-gray-100 rounded-lg transition-all duration-300"
              title="Expand Menu"
            >
              <FiMenu size={20} className="text-primary-600" />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <Link
              href="/dashboard"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 -m-1.5 transition-colors hover:bg-white/80"
              title={schoolName}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
                <AppLogo variant="sidebar" src={schoolLogo} alt={schoolName} />
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2"
                  title={schoolName}
                >
                  {schoolName}
                </p>
              </div>
            </Link>
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex relative mt-0.5 p-1.5 hover:bg-gray-100 rounded-lg transition-all duration-300 group flex-shrink-0"
              title="Collapse Menu"
            >
              <FiChevronsLeft size={18} className="text-gray-500" />
            </button>
          </div>
        )}
      </div>

      <nav className="mt-1 pb-6">
        {SIDEBAR_NAV_GROUPS.map((group) => {
          const Icon = group.icon;
          const expanded = expandedGroups[group.id];
          const active = isGroupActive(group.id);

          if (displayCollapsed) {
            return (
              <div key={group.id} className="relative group">
                <button
                  type="button"
                  className={`sidebar-nav-link flex items-center justify-center w-full px-3 py-2.5 transition-colors ${
                    active
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title={group.title}
                >
                  <Icon className="sidebar-nav-icon w-5 h-5 flex-shrink-0" />
                </button>
                <div className="absolute left-full top-0 ml-2 py-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50 min-w-[200px] max-h-[70vh] overflow-y-auto">
                  <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                    {group.title}
                  </p>
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={`${group.id}-${item.path}`}
                        href={item.path}
                        onClick={() => onMobileClose?.()}
                        className={`flex items-center gap-2.5 px-3 py-2 text-sm ${
                          isNavLinkActive(pathname, item.path)
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <ItemIcon className="w-4 h-4 shrink-0 opacity-80" />
                        <span className="flex-1 min-w-0">{item.name}</span>
                        {item.comingSoon && (
                          <span className="text-[10px] uppercase tracking-wide text-amber-600 font-semibold shrink-0">
                            Soon
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <div key={group.id} className="mb-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`sidebar-nav-link flex items-center w-full px-4 py-2 transition-colors ${
                  active
                    ? 'text-primary-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="sidebar-nav-icon w-4 h-4 flex-shrink-0 text-gray-400" />
                <span className="whitespace-nowrap flex-1 text-left text-[13px] uppercase tracking-wide leading-snug ml-2">
                  {group.title}
                </span>
                {expanded ? (
                  <FiChevronDown className="w-4 h-4 flex-shrink-0 text-gray-400" />
                ) : (
                  <FiChevronRight className="w-4 h-4 flex-shrink-0 text-gray-400" />
                )}
              </button>

              {expanded && (
                <div className="pb-2">
                  <p className="px-4 pl-10 pr-3 text-[11px] text-gray-400 leading-snug mb-1">
                    {group.description}
                  </p>
                  {group.items.map((item) => {
                    const itemActive = isNavLinkActive(pathname, item.path);
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={`${group.id}-${item.path}`}
                        href={item.path}
                        onClick={() => onMobileClose?.()}
                        className={`flex items-center gap-2.5 pl-8 pr-4 py-1.5 text-sm transition-colors ${
                          itemActive
                            ? 'text-primary-700 bg-primary-50 border-r-2 border-primary-600 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <ItemIcon
                          className={`w-4 h-4 shrink-0 ${
                            itemActive ? 'text-primary-600' : 'text-gray-400'
                          }`}
                        />
                        <span className="flex-1 min-w-0">{item.name}</span>
                        {item.comingSoon && (
                          <span className="text-[10px] uppercase tracking-wide text-amber-600 font-semibold shrink-0">
                            Soon
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
