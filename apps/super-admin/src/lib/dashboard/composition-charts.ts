import type { RequestDb } from '@/lib/request-db';
import { classNameOrderSql } from '@/lib/class-sort';
import { academicYearFilterValues } from '@/lib/fees/AcademicYear';

export interface DashboardNamedCount {
  name: string;
  count: number;
}

export interface DashboardCompositionCharts {
  students_by_class: DashboardNamedCount[];
  admissions_by_status: DashboardNamedCount[];
  staff_by_department: DashboardNamedCount[];
}

function formatAdmissionStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function fetchDashboardCompositionCharts(
  db: RequestDb,
  academicYear: string,
  academicYearId: number | null = null,
): Promise<DashboardCompositionCharts> {
  const yearVariants = academicYearFilterValues(academicYear);

  const [studentsResult, admissionsResult, staffResult] = await Promise.all([
    db.query<{ name: string; count: string }>(
      `SELECT COALESCE(c.name, 'Unassigned') AS name, COUNT(DISTINCT s.id)::text AS count
       FROM students s
       INNER JOIN student_enrollments se ON se.student_id = s.id
         AND (
           se.academic_year = ANY($1::text[])
           OR ($2::int IS NOT NULL AND se.academic_year_id = $2)
         )
         AND se.status IN ('active', 'promoted', 'repeated')
       LEFT JOIN classes c ON c.id = COALESCE(se.class_id, s.class_id)
       WHERE s.status = 'active'
       GROUP BY c.name
       ORDER BY ${classNameOrderSql('c.name', { nullsFirst: true, prioritizeNull: true })}`,
      [yearVariants, academicYearId],
    ),
    db.query<{ status: string; count: string }>(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::text AS count
       FROM admission_inquiries
       GROUP BY status
       ORDER BY count DESC`,
    ),
    db.query<{ name: string; count: string }>(
      `SELECT COALESCE(d.name, 'Unassigned') AS name, COUNT(s.id)::text AS count
       FROM staff s
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.status = 'active'
       GROUP BY d.name
       ORDER BY count DESC`,
    ),
  ]);

  return {
    students_by_class: studentsResult.rows.map((row) => ({
      name: row.name,
      count: parseInt(row.count, 10),
    })),
    admissions_by_status: admissionsResult.rows.map((row) => ({
      name: formatAdmissionStatus(row.status),
      count: parseInt(row.count, 10),
    })),
    staff_by_department: staffResult.rows.map((row) => ({
      name: row.name,
      count: parseInt(row.count, 10),
    })),
  };
}
