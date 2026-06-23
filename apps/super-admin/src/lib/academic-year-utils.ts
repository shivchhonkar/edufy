import { getDefaultAcademicYearForDate } from '@/lib/fees/AcademicYear';

export interface AcademicYearConfig {
  name: string;
  start_date: string;
  end_date: string;
}

/** Indian school session: April → March. Name format e.g. 2026-27 */
export function getDefaultAcademicYearConfig(date = new Date()): AcademicYearConfig {
  const parsed = getDefaultAcademicYearForDate(date);
  return {
    name: parsed.name,
    start_date: parsed.startDate,
    end_date: parsed.endDate,
  };
}

export function formatAcademicYearDates(startDate: string, endDate: string): string {
  const fmt = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}
