'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { NavGroup } from '@/shared/navigation/sidebar-navigation';
import {
  isGroupOnlyNavItem,
  isNavItemTreeActive,
  isNavLinkActive,
  nestedNavKey,
} from '@/shared/navigation/sidebar-navigation';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';

interface CollapsedNavGroupFlyoutProps {
  group: NavGroup;
  active: boolean;
  pathname: string;
  onNavigate?: () => void;
}

const CLOSE_DELAY_MS = 120;

export default function CollapsedNavGroupFlyout({
  group,
  active,
  pathname,
  onNavigate,
}: CollapsedNavGroupFlyoutProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [expandedNested, setExpandedNested] = useState<Record<string, boolean>>({});

  const Icon = group.icon;

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuHeight = menuRef.current?.offsetHeight ?? 320;
    const viewportPadding = 8;
    let top = rect.top;

    if (top + menuHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, window.innerHeight - menuHeight - viewportPadding);
    }

    setCoords({
      top,
      left: rect.right + 4,
    });
  }, []);

  const openMenu = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!open) return;

    updatePosition();
    const frame = window.requestAnimationFrame(() => updatePosition());

    const handleReposition = () => updatePosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const menu =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            id={menuId}
            ref={menuRef}
            role="menu"
            aria-label={group.title}
            className="fixed z-[120] min-w-[220px] max-w-[280px] max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
            style={{ top: coords.top, left: coords.left }}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
          >
            <div
              aria-hidden
              className="absolute right-full top-0 h-full w-2"
            />
            <p className="border-b border-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {group.title}
            </p>
            {group.items.map((item) => {
              const ItemIcon = item.icon;
              const childItems = item.items ?? [];
              const nestedKey = nestedNavKey(group.id, item.path);
              const nestedOpen =
                expandedNested[nestedKey] ?? (childItems.length > 0 && isNavItemTreeActive(pathname, item));
              const itemActive =
                childItems.length > 0
                  ? isNavItemTreeActive(pathname, item)
                  : isNavLinkActive(pathname, item.path);
              const groupOnly = isGroupOnlyNavItem(item);

              return (
                <div key={`${group.id}-${item.path}`}>
                  {groupOnly ? (
                    <button
                      type="button"
                      aria-label={nestedOpen ? `Collapse ${item.name}` : `Expand ${item.name}`}
                      aria-expanded={nestedOpen}
                      onClick={() =>
                        setExpandedNested((prev) => ({
                          ...prev,
                          [nestedKey]: !nestedOpen,
                        }))
                      }
                      className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] uppercase tracking-wide transition-colors ${
                        itemActive
                          ? 'font-medium text-primary-700'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                    >
                      <ItemIcon
                        className={`sidebar-nav-icon h-3.5 w-3.5 shrink-0 ${
                          itemActive ? 'sidebar-nav-icon-active' : 'sidebar-nav-icon-muted'
                        }`}
                      />
                      <span className="min-w-0 flex-1">{item.name}</span>
                      {nestedOpen ? (
                        <FiChevronDown className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <FiChevronRight className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center">
                      <Link
                        href={item.path}
                        role="menuitem"
                        onClick={() => {
                          if (childItems.length > 0) {
                            setExpandedNested((prev) => ({ ...prev, [nestedKey]: true }));
                          }
                          setOpen(false);
                          onNavigate?.();
                        }}
                        className={`flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-xs transition-colors ${
                          itemActive
                            ? 'bg-primary-50 font-medium text-primary-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <ItemIcon
                          className={`sidebar-nav-icon h-3.5 w-3.5 shrink-0 ${
                            itemActive ? 'sidebar-nav-icon-active' : 'sidebar-nav-icon-muted'
                          }`}
                        />
                        <span className="min-w-0 flex-1">{item.name}</span>
                        {item.comingSoon && (
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                            Soon
                          </span>
                        )}
                      </Link>
                      {childItems.length > 0 && (
                        <button
                          type="button"
                          aria-label={nestedOpen ? `Collapse ${item.name}` : `Expand ${item.name}`}
                          aria-expanded={nestedOpen}
                          onClick={() =>
                            setExpandedNested((prev) => ({
                              ...prev,
                              [nestedKey]: !nestedOpen,
                            }))
                          }
                          className="mr-1 rounded p-1 text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                        >
                          {nestedOpen ? (
                            <FiChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <FiChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  {childItems.length > 0 && nestedOpen
                    ? childItems.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = isNavLinkActive(pathname, child.path);
                        return (
                          <Link
                            key={`${group.id}-${child.path}`}
                            href={child.path}
                            role="menuitem"
                            onClick={() => {
                              setOpen(false);
                              onNavigate?.();
                            }}
                            className={`flex items-center gap-2 py-1.5 pl-7 pr-2.5 text-xs transition-colors ${
                              childActive
                                ? 'bg-primary-50 font-medium text-primary-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <ChildIcon
                              className={`sidebar-nav-icon h-3.5 w-3.5 shrink-0 ${
                                childActive ? 'sidebar-nav-icon-active' : 'sidebar-nav-icon-muted'
                              }`}
                            />
                            <span className="min-w-0 flex-1">{child.name}</span>
                            {child.comingSoon && (
                              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                                Soon
                              </span>
                            )}
                          </Link>
                        );
                      })
                    : null}
                </div>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={group.title}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`sidebar-nav-link flex w-full items-center justify-center rounded-md px-1 py-1.5 mb-0.5 transition-colors ${
          active
            ? 'border-r-2 border-primary-600 bg-primary-50 text-primary-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <span
          className={`sidebar-icon-badge flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
            active ? 'sidebar-icon-badge-active' : 'sidebar-icon-badge-default'
          }`}
        >
          <Icon className="sidebar-nav-icon h-4 w-4" />
        </span>
      </button>
      {menu}
    </>
  );
}
