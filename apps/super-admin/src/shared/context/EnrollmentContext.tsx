'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getClientToken } from '@/lib/client-auth';
import { useSettings } from '@/shared/SettingsContext';

export interface AcademicYearOption {
  id: number;
  name: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

interface EnrollmentContextType {
  academicYears: AcademicYearOption[];
  activeAcademicYear: AcademicYearOption | null;
  selectedAcademicYear: AcademicYearOption | null;
  selectedAcademicYearId: number | null;
  setSelectedAcademicYearId: (id: number | null) => void;
  loading: boolean;
  refresh: () => Promise<void>;
  sessionQueryParams: Record<string, string>;
}

const EnrollmentContext = createContext<EnrollmentContextType | null>(null);

export function EnrollmentProvider({ children }: { children: ReactNode }) {
  const { settings, activeSchoolId } = useSettings();
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchYears = useCallback(async () => {
    if (!getClientToken()) {
      setAcademicYears([]);
      setSelectedAcademicYearId(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/academic-years', {
        cache: 'no-store',
        credentials: 'include',
      });
      const payload = await response.json();
      if (payload.success && Array.isArray(payload.data)) {
        setAcademicYears(payload.data);
        const active = payload.data.find((y: AcademicYearOption) => y.is_active);
        setSelectedAcademicYearId((prev) => {
          if (prev != null && payload.data.some((y: AcademicYearOption) => y.id === prev)) {
            return prev;
          }
          return active?.id ?? payload.data[0]?.id ?? null;
        });
      }
    } catch (error) {
      console.error('Failed to load academic years:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchYears();
  }, [fetchYears, activeSchoolId, settings.academic_year]);

  const activeAcademicYear = useMemo(
    () => academicYears.find((y) => y.is_active) ?? academicYears[0] ?? null,
    [academicYears]
  );

  const selectedAcademicYear = useMemo(
    () =>
      academicYears.find((y) => y.id === selectedAcademicYearId) ??
      activeAcademicYear,
    [academicYears, selectedAcademicYearId, activeAcademicYear]
  );

  const sessionQueryParams = useMemo(() => {
    if (!selectedAcademicYear) return {};
    return {
      academic_year_id: String(selectedAcademicYear.id),
      academic_year: selectedAcademicYear.name,
    };
  }, [selectedAcademicYear]);

  const value = useMemo(
    () => ({
      academicYears,
      activeAcademicYear,
      selectedAcademicYear,
      selectedAcademicYearId: selectedAcademicYear?.id ?? null,
      setSelectedAcademicYearId,
      loading,
      refresh: fetchYears,
      sessionQueryParams,
    }),
    [
      academicYears,
      activeAcademicYear,
      selectedAcademicYear,
      loading,
      fetchYears,
      sessionQueryParams,
    ]
  );

  return (
    <EnrollmentContext.Provider value={value}>{children}</EnrollmentContext.Provider>
  );
}

export function useEnrollmentSession() {
  const ctx = useContext(EnrollmentContext);
  if (!ctx) {
    throw new Error('useEnrollmentSession must be used within EnrollmentProvider');
  }
  return ctx;
}

export function withSessionQuery(path: string, params: Record<string, string>): string {
  const url = new URL(path, 'http://local');
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return `${url.pathname}${url.search}`;
}
