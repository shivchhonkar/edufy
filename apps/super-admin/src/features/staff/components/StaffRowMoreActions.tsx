'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FiActivity,
  FiCalendar,
  FiCreditCard,
  FiMoreVertical,
} from 'react-icons/fi';
import type { StaffListItem } from './VirtualizedStaffTable';

interface StaffRowMoreActionsProps {
  staff: StaffListItem;
  onGenerateId: (staff: StaffListItem) => void;
  onViewAttendance: (staff: StaffListItem) => void;
  onViewActivity: (staff: StaffListItem) => void;
}

export default function StaffRowMoreActions({
  staff,
  onGenerateId,
  onViewAttendance,
  onViewActivity,
}: StaffRowMoreActionsProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = `staff-actions-menu-${staff.id}`;

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 192;
      setCoords({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - menuWidth),
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      const menu = document.getElementById(menuId);
      if (menu?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open, menuId]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const menuItems = [
    {
      label: 'Generate ID',
      icon: FiCreditCard,
      onClick: () => {
        setOpen(false);
        onGenerateId(staff);
      },
    },
    {
      label: 'View Attendance',
      icon: FiCalendar,
      onClick: () => {
        setOpen(false);
        onViewAttendance(staff);
      },
    },
    {
      label: 'View Activity',
      icon: FiActivity,
      onClick: () => {
        setOpen(false);
        onViewActivity(staff);
      },
    },
  ] as const;

  const menu =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            id={menuId}
            role="menu"
            className="fixed z-[100] min-w-[12rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            style={{ top: coords.top, left: coords.left }}
          >
            {menuItems.map(({ label, icon: Icon, onClick }) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                onClick={onClick}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <Icon size={15} className="shrink-0 text-gray-400" />
                {label}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex shrink-0 items-center justify-center p-1 text-gray-500 hover:text-gray-700"
        title="More actions"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <FiMoreVertical size={18} />
      </button>
      {menu}
    </>
  );
}
