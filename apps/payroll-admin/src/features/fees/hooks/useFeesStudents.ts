'use client';

import { useCallback, useEffect, useState } from 'react';
import { STUDENTS_FETCH_LIMIT } from '@/features/fees/utils/fees-format';
import type { FeeStudentRow } from '@/features/fees/components/VirtualizedFeesStudentsTable';

export function useFeesStudents(academicYear?: string) {
  const [students, setStudents] = useState<FeeStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const yearParam = academicYear ? `?academic_year=${encodeURIComponent(academicYear)}` : '';
      const params = new URLSearchParams({
        status: 'active',
        class_id: 'assigned',
        limit: String(STUDENTS_FETCH_LIMIT),
        page: '1',
      });

      const [studentsRes, statusRes] = await Promise.all([
        fetch(`/api/students?${params}`),
        fetch(`/api/fees/students-status${yearParam}`),
      ]);

      const data = await studentsRes.json();
      const statusData = await statusRes.json();

      if (!data.success) {
        setError(data.error || 'Failed to load students');
        return;
      }

      const statusByStudent: Record<number, { pendingAmount: number; paymentStatus: string }> =
        statusData.success ? statusData.data : {};

      const studentsWithStatus: FeeStudentRow[] = data.data.map((student: FeeStudentRow) => {
        const feeStatus = statusByStudent[student.id];
        if (feeStatus) {
          return {
            ...student,
            pendingAmount: feeStatus.pendingAmount,
            paymentStatus: feeStatus.paymentStatus,
          };
        }
        return {
          ...student,
          pendingAmount: 0,
          paymentStatus: statusData.success ? 'not_assigned' : 'unknown',
        };
      });

      setStudents(studentsWithStatus);
    } catch {
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { students, loading, error, refresh };
}
