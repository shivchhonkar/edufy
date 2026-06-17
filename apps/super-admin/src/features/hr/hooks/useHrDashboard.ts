'use client';

import { useCallback, useEffect, useState } from 'react';

export interface HrDashboardData {
  total_staff: number;
  inactive_staff: number;
  total_teachers: number;
  pending_leaves: number;
  departments: number;
  staff_present_today: number;
  payroll_pending: number;
  payroll_paid: number;
  payroll_total_staff: number;
  payroll_amount: number;
  payroll_month: number;
  payroll_year: number;
  recent_leaves: Array<Record<string, unknown>>;
  recent_activities: Array<Record<string, unknown>>;
}

export interface TeacherPerformanceSummary {
  total_teachers: number;
  avg_score: number;
  top_teacher: { teacher_name: string; score: number } | null;
}

export function useHrDashboard() {
  const [stats, setStats] = useState<HrDashboardData | null>(null);
  const [teacherSummary, setTeacherSummary] = useState<TeacherPerformanceSummary | null>(null);
  const [topTeachers, setTopTeachers] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardRes, performanceRes] = await Promise.all([
        fetch('/api/hr/dashboard', { cache: 'no-store' }),
        fetch('/api/teachers/performance?days=30', { cache: 'no-store' }),
      ]);
      const dashboardData = await dashboardRes.json();
      const performanceData = await performanceRes.json();

      if (dashboardData.success) {
        setStats(dashboardData.data);
      } else {
        setError(dashboardData.error || 'Failed to load dashboard');
      }

      if (performanceData.success) {
        setTeacherSummary(performanceData.data.summary);
        setTopTeachers((performanceData.data.ranking || []).slice(0, 5));
      }
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, teacherSummary, topTeachers, loading, error, refresh };
}
