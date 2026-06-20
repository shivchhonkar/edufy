'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Student } from '@/shared/types';

/** Pre-select a student when landing with ?student_id= from the students list actions menu. */
export function usePreselectStudentIdsFromUrl(
  students: Student[],
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<number>>>,
) {
  const searchParams = useSearchParams();
  const appliedIdRef = useRef<number | null>(null);

  useEffect(() => {
    const raw = searchParams.get('student_id');
    if (!raw || students.length === 0) return;

    const id = parseInt(raw, 10);
    if (!Number.isFinite(id) || !students.some((s) => s.id === id)) return;
    if (appliedIdRef.current === id) return;

    appliedIdRef.current = id;
    setSelectedIds(new Set([id]));
  }, [searchParams, students, setSelectedIds]);
}

export function usePreselectGatePassStudentFromUrl(
  students: Student[],
  setSelectedStudentId: React.Dispatch<React.SetStateAction<number | null>>,
  setStudentPickerExpanded: React.Dispatch<React.SetStateAction<boolean>>,
  setActiveTab: React.Dispatch<React.SetStateAction<'issue' | 'history'>>,
) {
  const searchParams = useSearchParams();
  const appliedIdRef = useRef<number | null>(null);

  useEffect(() => {
    const raw = searchParams.get('student_id');
    if (!raw || students.length === 0) return;

    const id = parseInt(raw, 10);
    if (!Number.isFinite(id) || !students.some((s) => s.id === id)) return;
    if (appliedIdRef.current === id) return;

    appliedIdRef.current = id;
    setSelectedStudentId(id);
    setStudentPickerExpanded(false);
    setActiveTab('issue');
  }, [searchParams, students, setSelectedStudentId, setStudentPickerExpanded, setActiveTab]);
}
