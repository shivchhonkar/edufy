'use client';

import { useEffect, useState } from 'react';
import { getActiveSchoolId, SCHOOL_SWITCHED_EVENT } from '@/lib/client-auth';

/** Re-run effects when the active school changes (header switcher or login). */
export function useActiveSchoolId(): number | null {
  const [schoolId, setSchoolId] = useState<number | null>(() => getActiveSchoolId());

  useEffect(() => {
    const sync = () => setSchoolId(getActiveSchoolId());
    window.addEventListener(SCHOOL_SWITCHED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SCHOOL_SWITCHED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return schoolId;
}
