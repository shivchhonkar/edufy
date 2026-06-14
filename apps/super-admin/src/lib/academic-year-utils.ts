export interface AcademicYearConfig {
  name: string;
  start_date: string;
  end_date: string;
}

/** Indian school session: April → March. Name format e.g. 2026-27 */
export function getDefaultAcademicYearConfig(date = new Date()): AcademicYearConfig {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;

  return {
    name: `${startYear}-${String(endYear).slice(-2)}`,
    start_date: `${startYear}-04-01`,
    end_date: `${endYear}-03-31`,
  };
}

export function formatAcademicYearDates(startDate: string, endDate: string): string {
  const fmt = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}
