import { getSchoolsForOrganization, getTenantDbConfig } from '@edulakhya/tenant';
import { queryForTenant } from '@edulakhya/database';

const cache = new Map<string, { expires: number; data: OrgAggregatedMetrics }>();
const CACHE_TTL_MS = 60_000;

export interface SchoolMetricRow {
  school_id: number;
  school_name: string;
  school_slug: string;
  students: number;
  staff: number;
  teachers: number;
  fee_collected: number;
  fee_outstanding: number;
  admissions_pending: number;
  admissions_new_week: number;
  attendance_rate: number;
  vehicles: number;
}

export interface OrgAggregatedMetrics {
  organization_id: number;
  generated_at: string;
  totals: {
    schools: number;
    students: number;
    staff: number;
    teachers: number;
    fee_collected: number;
    fee_outstanding: number;
    admissions_pending: number;
    admissions_new_week: number;
    attendance_rate: number;
    vehicles: number;
  };
  schools: SchoolMetricRow[];
}

async function safeCount(
  dbConfig: ReturnType<typeof getTenantDbConfig>,
  sql: string,
): Promise<number> {
  try {
    const result = await queryForTenant<{ count: number }>(dbConfig, sql);
    return result.rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

async function aggregateSchool(
  school: Awaited<ReturnType<typeof getSchoolsForOrganization>>[number],
): Promise<SchoolMetricRow> {
  const dbConfig = getTenantDbConfig(school);

  const [
    students,
    staff,
    teachers,
    feeCollected,
    feeOutstanding,
    admissionsPending,
    admissionsNewWeek,
    vehicles,
    attendanceRate,
  ] = await Promise.all([
    safeCount(dbConfig, 'SELECT COUNT(*)::int AS count FROM students WHERE deleted_at IS NULL'),
    safeCount(dbConfig, 'SELECT COUNT(*)::int AS count FROM staff'),
    safeCount(
      dbConfig,
      `SELECT COUNT(*)::int AS count FROM users WHERE role = 'teacher' AND is_active = true`,
    ),
    safeCount(
      dbConfig,
      `SELECT COALESCE(SUM(amount_paid), 0)::float AS count FROM fee_payments`,
    ).then((n) => Math.round(n)),
    safeCount(
      dbConfig,
      `SELECT COALESCE(SUM(balance), 0)::float AS count FROM student_fees WHERE status != 'paid'`,
    ).then((n) => Math.round(n)),
    safeCount(
      dbConfig,
      `SELECT COUNT(*)::int AS count FROM admission_inquiries WHERE status NOT IN ('admitted', 'rejected', 'closed')`,
    ),
    safeCount(
      dbConfig,
      `SELECT COUNT(*)::int AS count FROM admission_inquiries WHERE created_at >= NOW() - INTERVAL '7 days'`,
    ),
    safeCount(dbConfig, 'SELECT COUNT(*)::int AS count FROM transport_vehicles'),
    queryForTenant<{ rate: number }>(
      dbConfig,
      `SELECT CASE WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(COUNT(*) FILTER (WHERE status = 'present')::numeric / COUNT(*)::numeric * 100)::int
        END AS rate
       FROM attendance
       WHERE date = CURRENT_DATE`,
    )
      .then((r) => r.rows[0]?.rate ?? 0)
      .catch(() => 0),
  ]);

  return {
    school_id: school.id,
    school_name: school.name,
    school_slug: school.slug,
    students,
    staff,
    teachers,
    fee_collected: feeCollected,
    fee_outstanding: feeOutstanding,
    admissions_pending: admissionsPending,
    admissions_new_week: admissionsNewWeek,
    attendance_rate: attendanceRate,
    vehicles,
  };
}

export async function getOrganizationMetrics(
  organizationId: number,
  options?: { skipCache?: boolean },
): Promise<OrgAggregatedMetrics> {
  const cacheKey = `org:${organizationId}`;
  const cached = cache.get(cacheKey);
  if (!options?.skipCache && cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const schools = await getSchoolsForOrganization(organizationId);
  const rows = await Promise.all(schools.map(aggregateSchool));

  const totals = rows.reduce(
    (acc, row) => ({
      schools: acc.schools + 1,
      students: acc.students + row.students,
      staff: acc.staff + row.staff,
      teachers: acc.teachers + row.teachers,
      fee_collected: acc.fee_collected + row.fee_collected,
      fee_outstanding: acc.fee_outstanding + row.fee_outstanding,
      admissions_pending: acc.admissions_pending + row.admissions_pending,
      admissions_new_week: acc.admissions_new_week + row.admissions_new_week,
      attendance_rate: acc.attendance_rate + row.attendance_rate,
      vehicles: acc.vehicles + row.vehicles,
    }),
    {
      schools: 0,
      students: 0,
      staff: 0,
      teachers: 0,
      fee_collected: 0,
      fee_outstanding: 0,
      admissions_pending: 0,
      admissions_new_week: 0,
      attendance_rate: 0,
      vehicles: 0,
    },
  );

  if (rows.length > 0) {
    totals.attendance_rate = Math.round(totals.attendance_rate / rows.length);
  }

  const data: OrgAggregatedMetrics = {
    organization_id: organizationId,
    generated_at: new Date().toISOString(),
    totals,
    schools: rows,
  };

  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, data });
  return data;
}

export function invalidateOrgMetricsCache(organizationId: number) {
  cache.delete(`org:${organizationId}`);
}
