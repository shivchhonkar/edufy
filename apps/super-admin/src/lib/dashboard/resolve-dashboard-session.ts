import type { NextRequest } from 'next/server';
import type { RequestDb } from '@/lib/request-db';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';
import { resolveAcademicYearRecord } from '@/lib/enrollment-service';
import { academicYearFilterValues } from '@/lib/fees/AcademicYear';

export interface DashboardSession {
  academicYear: string;
  academicYearId: number | null;
  yearVariants: string[];
}

/** Resolve dashboard session from ?academic_year_id= / ?academic_year= or active session. */
export async function resolveDashboardSession(
  db: RequestDb,
  request: NextRequest,
): Promise<DashboardSession> {
  const params = request.nextUrl.searchParams;
  const idRaw = params.get('academic_year_id');
  const yearParam = params.get('academic_year');

  let academicYearId: number | null = idRaw != null ? parseInt(idRaw, 10) : null;
  if (academicYearId != null && Number.isNaN(academicYearId)) {
    academicYearId = null;
  }

  let academicYear: string;

  if (academicYearId != null || yearParam) {
    const record = await resolveAcademicYearRecord(db, academicYearId, yearParam);
    academicYear = record.name;
    academicYearId = record.id;
  } else {
    academicYear = await resolveAcademicYear(db, null);
    try {
      const record = await resolveAcademicYearRecord(db, null, academicYear);
      academicYearId = record.id;
    } catch {
      academicYearId = null;
    }
  }

  return {
    academicYear,
    academicYearId,
    yearVariants: academicYearFilterValues(academicYear),
  };
}

/** SQL EXISTS clause — student enrolled in the selected session. */
export function studentInSessionSql(
  studentAlias: string,
  yearVariantsIndex = 1,
  yearIdIndex = 2,
): string {
  return `EXISTS (
    SELECT 1 FROM student_enrollments se
    WHERE se.student_id = ${studentAlias}.id
      AND (
        se.academic_year = ANY($${yearVariantsIndex}::text[])
        OR ($${yearIdIndex}::int IS NOT NULL AND se.academic_year_id = $${yearIdIndex})
      )
      AND se.status IN ('active', 'promoted', 'repeated')
  )`;
}
