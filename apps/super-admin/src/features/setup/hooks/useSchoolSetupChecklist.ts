'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SetupChecklist } from '@/features/setup/constants/setup-checklist';
import { useActiveSchoolId } from '@/hooks/use-active-school-id';

const EMPTY_CHECKLIST: SetupChecklist = {
  school_profile: false,
  academic_year: false,
  classes_sections: false,
  subjects: false,
  fee_setup: false,
};

export function useSchoolSetupChecklist(enabled = true) {
  const activeSchoolId = useActiveSchoolId();
  const [checklist, setChecklist] = useState<SetupChecklist>(EMPTY_CHECKLIST);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch('/api/setup/progress', { cache: 'no-store', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setChecklist({ ...EMPTY_CHECKLIST, ...data.data.checklist });
        setIsComplete(!!data.data.is_complete);
      }
    } catch (err) {
      console.error('Failed to load setup checklist', err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh, activeSchoolId]);

  const hasPending = !isComplete && Object.values(checklist).some((v) => !v);

  return { checklist, isComplete, hasPending, loading, refresh };
}
