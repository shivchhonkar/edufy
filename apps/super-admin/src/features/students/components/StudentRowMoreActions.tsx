'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Student } from '@/shared/types';
import { FiCreditCard, FiFileText, FiMoreVertical, FiShield } from 'react-icons/fi';

interface StudentRowMoreActionsProps {
  student: Student;
  onGenerateTc?: (student: Student) => void;
  onGatePass?: (student: Student) => void;
  onIdCard?: (student: Student) => void;
}

const MENU_ITEMS = [
  {
    id: 'tc' as const,
    label: 'Generate TC',
    icon: FiFileText,
  },
  {
    id: 'gate-pass' as const,
    label: 'Gate Pass',
    icon: FiShield,
  },
  {
    id: 'id-card' as const,
    label: 'ID Card',
    icon: FiCreditCard,
  },
];

export default function StudentRowMoreActions({
  student,
  onGenerateTc,
  onGatePass,
  onIdCard,
}: StudentRowMoreActionsProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = `student-actions-menu-${student.id}`;

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

  const handleAction = (id: (typeof MENU_ITEMS)[number]['id']) => {
    setOpen(false);
    if (id === 'tc') onGenerateTc?.(student);
    if (id === 'gate-pass') onGatePass?.(student);
    if (id === 'id-card') onIdCard?.(student);
  };

  const menu =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            id={menuId}
            role="menu"
            className="fixed z-[100] min-w-[12rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            style={{ top: coords.top, left: coords.left }}
          >
            {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                onClick={() => handleAction(id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
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
