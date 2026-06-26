import type { RequestDb } from '@/lib/request-db';
import { classNameOrderSql } from '@/lib/class-sort';

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
): Promise<DashboardCompositionCharts> {
  const [studentsResult, admissionsResult, staffResult] = await Promise.all([
    db.query<{ name: string; count: string }>(
      `SELECT COALESCE(c.name, 'Unassigned') AS name, COUNT(s.id)::text AS count
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.status = 'active'
       GROUP BY c.name
       ORDER BY ${classNameOrderSql('c.name', { nullsFirst: true, prioritizeNull: true })}`,
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
