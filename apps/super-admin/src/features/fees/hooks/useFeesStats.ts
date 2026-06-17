'use client';

import { useCallback, useEffect, useState } from 'react';

export interface FeesStatsData {
  total_collected: number;
  total_pending: number;
  this_month: number;
  total_overdue: number;
  total_late_fees: number;
  pending_students_count: number;
  recent_payments: Array<Record<string, unknown>>;
  collection_by_category: Array<{ category: string; total: string | number }>;
  monthly_trend: Array<{ month: string; year: string; total: string | number }>;
  academic_year_used?: string;
}

export function useFeesStats(academicYear?: string) {
  const [stats, setStats] = useState<FeesStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/fees/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || 'Failed to load statistics');
      }
    } catch {
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, academicYear]);

  return { stats, loading, error, refresh };
}
