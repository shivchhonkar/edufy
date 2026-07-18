'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getActiveSchoolSlugFromToken,
  getClientToken,
  getClientUser,
  notifySchoolSwitched,
  setClientSession,
  clearClientSession,
} from '@/lib/client-auth';
import { extractSubdomain } from '@/lib/tenant-host';
import { isCurrentSchoolHost } from '@/lib/school-app-url';

/**
 * When the URL subdomain and JWT school differ, prefer the URL:
 * - Org users: switch session to the URL school (stay on same host).
 * - Others: clear the mismatched session and show login on the current host.
 */
export function useSchoolSessionAlign() {
  const started = useRef(false);
  const [aligning, setAligning] = useState(false);

  useEffect(() => {
    if (started.current) return;
    if (!getClientToken()) return;

    const hostSlug = extractSubdomain(window.location.host);
    if (!hostSlug) return;

    const jwtSlug = getActiveSchoolSlugFromToken();
    if (!jwtSlug || isCurrentSchoolHost(jwtSlug)) return;

    started.current = true;
    setAligning(true);

    const finishWithLoginOnCurrentHost = () => {
      clearClientSession();
      window.location.replace('/login');
    };

    void (async () => {
      try {
        const sessionRes = await fetch('/api/org/session', {
          cache: 'no-store',
          credentials: 'include',
        });
        const sessionData = await sessionRes.json();

        if (!sessionData.success || !sessionData.data?.canSwitchSchool) {
          finishWithLoginOnCurrentHost();
          return;
        }

        const targetSchool = sessionData.data.schools?.find(
          (school: { slug: string }) =>
            school.slug.trim().toLowerCase() === hostSlug.trim().toLowerCase(),
        );

        if (!targetSchool) {
          finishWithLoginOnCurrentHost();
          return;
        }

        const switchRes = await fetch('/api/auth/switch-school', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ school_id: targetSchool.id }),
        });
        const switchData = await switchRes.json();

        if (!switchData.success) {
          finishWithLoginOnCurrentHost();
          return;
        }

        const prevUser = getClientUser() || {};
        setClientSession(switchData.data.token, { ...prevUser, ...switchData.data.user });
        notifySchoolSwitched(targetSchool.id);
        window.location.reload();
      } catch {
        finishWithLoginOnCurrentHost();
      }
    })();
  }, []);

  return { aligning };
}
