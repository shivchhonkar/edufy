'use client';

import type { RefObject } from 'react';
import type { OrgSession, SchoolOption } from '@/hooks/use-school-switch-session';

interface SchoolSwitcherMenuProps {
  session: OrgSession;
  active: SchoolOption | null;
  switchError: string;
  switching: boolean;
  onSwitch: (schoolId: number) => void;
  onOrgDashboard: () => void;
  menuRef?: RefObject<HTMLDivElement | null>;
  style?: React.CSSProperties;
  className?: string;
}

export default function SchoolSwitcherMenu({
  session,
  active,
  switchError,
  switching,
  onSwitch,
  onOrgDashboard,
  menuRef,
  style,
  className = 'fixed z-[120] rounded-xl border border-gray-200 bg-white py-1 shadow-xl',
}: SchoolSwitcherMenuProps) {
  return (
    <div ref={menuRef} role="menu" aria-label="Switch school" className={className} style={style}>
      {switchError && (
        <p className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{switchError}</p>
      )}
      <div className="border-b border-gray-100 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Switch school</p>
        <p className="truncate text-xs text-gray-400">{session.organization.name}</p>
      </div>
      {session.schools.map((school) => (
        <button
          key={school.id}
          type="button"
          role="menuitem"
          disabled={switching}
          onClick={() => onSwitch(school.id)}
          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
            active?.id === school.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
          }`}
        >
          <span className="truncate">{school.name}</span>
          {active?.id === school.id && <span className="text-xs text-primary-600">Active</span>}
        </button>
      ))}
      <div className="border-t border-gray-100 px-3 py-2">
        <button
          type="button"
          onClick={onOrgDashboard}
          className="text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          Organization dashboard →
        </button>
      </div>
    </div>
  );
}
