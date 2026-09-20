'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_STUDENT_LOOKUP_SETTINGS,
  mergeStudentLookupSettings,
  type StudentLookupSettings,
} from '@/lib/student-lookup-settings';

export function useStudentLookups(enabled = true) {
  const [lookups, setLookups] = useState<StudentLookupSettings>(DEFAULT_STUDENT_LOOKUP_SETTINGS);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);

    fetch('/api/settings/student-lookups')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success) return;
        setLookups(mergeStudentLookupSettings(data.data));
      })
      .catch(() => {
        if (!cancelled) setLookups(DEFAULT_STUDENT_LOOKUP_SETTINGS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { lookups, loading };
}
