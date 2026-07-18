'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getClientToken,
  setClientSession,
  getClientUser,
  notifySchoolSwitched,
  SCHOOLS_LIST_UPDATED_EVENT,
} from '@/lib/client-auth';
import { setLastSelectedSchoolId } from '@/lib/selected-school';
import { isCurrentSchoolHost, redirectToSchoolApp } from '@/lib/school-app-url';

export type SchoolOption = {
  id: number;
  name: string;
  slug: string;
  is_primary: boolean;
  city: string | null;
};

export type OrgSession = {
  organization: { id: number; name: string; slug: string };
  schools: SchoolOption[];
  activeSchool: SchoolOption | null;
  canSwitchSchool: boolean;
};

export function useSchoolSwitchSession() {
  const router = useRouter();
  const [session, setSession] = useState<OrgSession | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuCollapsedRef = useRef(false);

  const canSwitch = Boolean(session?.canSwitchSchool);

  const loadSession = useCallback(async () => {
    if (!getClientToken()) return;
    try {
      const res = await fetch('/api/org/session', { cache: 'no-store', credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data?.canSwitchSchool) {
        setSession(data.data);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    const onSchoolsUpdated = () => {
      void loadSession();
    };
    window.addEventListener(SCHOOLS_LIST_UPDATED_EVENT, onSchoolsUpdated);
    return () => window.removeEventListener(SCHOOLS_LIST_UPDATED_EVENT, onSchoolsUpdated);
  }, [loadSession]);

  const updateMenuPosition = useCallback((collapsed: boolean) => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (!trigger) return;

    if (collapsed) {
      setCoords({ top: trigger.top, left: trigger.right + 6, width: 256 });
      return;
    }

    setCoords({ top: trigger.bottom + 4, left: trigger.left, width: Math.max(trigger.width, 220) });
  }, []);

  const toggleMenu = useCallback(
    (collapsed: boolean) => {
      menuCollapsedRef.current = collapsed;
      setOpen((value) => {
        const next = !value;
        if (next) {
          requestAnimationFrame(() => updateMenuPosition(collapsed));
        }
        return next;
      });
    },
    [updateMenuPosition],
  );

  useEffect(() => {
    if (!open) return;

    const onReposition = () => updateMenuPosition(menuCollapsedRef.current);
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const handleSwitch = async (schoolId: number) => {
    if (switching || session?.activeSchool?.id === schoolId) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    setSwitchError('');
    try {
      const res = await fetch('/api/auth/switch-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId }),
      });
      const data = await res.json();
      if (data.success) {
        const prevUser = getClientUser() || {};
        setClientSession(data.data.token, { ...prevUser, ...data.data.user });
        if (session?.organization.slug && data.data.school?.id) {
          setLastSelectedSchoolId(session.organization.slug, data.data.school.id);
        }
        setOpen(false);

        const schoolSlug = data.data.school?.slug;
        if (schoolSlug && !isCurrentSchoolHost(schoolSlug)) {
          redirectToSchoolApp(schoolSlug);
          return;
        }

        notifySchoolSwitched(data.data.school.id);
        window.location.reload();
      } else {
        setSwitchError(data.error || 'Unable to switch school. Please try again.');
      }
    } finally {
      setSwitching(false);
    }
  };

  const goToOrgDashboard = useCallback(() => {
    setOpen(false);
    router.push('/org/dashboard');
  }, [router]);

  return {
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
    setOpen,
  };
}
