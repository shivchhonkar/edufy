import type { RequestDb } from '@/lib/request-db';

export function parseAcademicYearStart(academicYear: string): Date {
  const parts = academicYear.split('-');
  let startYear = new Date().getFullYear();
  if (parts.length >= 1 && parts[0].trim()) {
    const y = parts[0].trim();
    startYear = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    if (Number.isNaN(startYear)) startYear = new Date().getFullYear();
  }
  return new Date(startYear, 3, 1);
}

export function dueDateForAcademicMonth(academicYearStart: Date, monthIndex: number): string {
  const d = new Date(academicYearStart);
  d.setMonth(academicYearStart.getMonth() + monthIndex - 1);
  d.setDate(10);
  return d.toISOString().split('T')[0];
}

export async function getOrCreateTransportFeeStructure(
  db: RequestDb,
  academicYear: string
): Promise<number> {
  const existing = await db.query<{ id: number }>(
    `SELECT id FROM fee_structures
     WHERE fee_type ILIKE '%transport%'
     AND academic_year = $1
     AND frequency = 'monthly'
     AND is_active = true
     LIMIT 1`,
    [academicYear]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const created = await db.query<{ id: number }>(
    `INSERT INTO fee_structures (
      class_id, fee_type, amount, frequency, academic_year,
      description, is_active, late_fee_percentage, late_fee_days
    ) VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id`,
    [
      'Transport Fee',
      0,
      'monthly',
      academicYear,
      'Monthly transport fee (varies by route/stop)',
      true,
      0,
      7,
    ]
  );

  return created.rows[0].id;
}

export type TransportAssignmentInfo = {
  route_name: string;
  route_number: string | null;
  stop_name: string | null;
  transport_fee: number;
};

export async function getActiveTransportAssignment(
  db: RequestDb,
  studentId: number
): Promise<TransportAssignmentInfo | null> {
  const result = await db.query<{
    transport_fee: string | number;
    route_name: string;
    route_number: string | null;
    stop_name: string | null;
  }>(
    `SELECT st.transport_fee, r.route_name, r.route_number, rs.stop_name
     FROM student_transport st
     JOIN routes r ON st.route_id = r.id
     LEFT JOIN route_stops rs ON st.stop_id = rs.id
     WHERE st.student_id = $1 AND st.status = 'active'
     LIMIT 1`,
    [studentId]
  );

  if (!result.rows.length) return null;

  const row = result.rows[0];
  const fee = parseFloat(String(row.transport_fee || 0));
  if (fee <= 0) return null;

  return {
    route_name: row.route_name,
    route_number: row.route_number,
    stop_name: row.stop_name,
    transport_fee: fee,
  };
}

export async function syncTransportFeesForStudent(
  db: RequestDb,
  studentId: number,
  academicYear: string
): Promise<{ created: number; updated: number; removed: number }> {
  const feeStructureId = await getOrCreateTransportFeeStructure(db, academicYear);
  const assignment = await getActiveTransportAssignment(db, studentId);
  const academicYearStart = parseAcademicYearStart(academicYear);

  if (!assignment) {
    const del = await db.query(
      `DELETE FROM student_fees
       WHERE student_id = $1 AND fee_structure_id = $2 AND academic_year = $3
       AND status IN ('pending', 'partial')`,
      [studentId, feeStructureId, academicYear]
    );
    return { created: 0, updated: 0, removed: del.rowCount || 0 };
  }

  let created = 0;
  let updated = 0;

  for (let month = 1; month <= 12; month++) {
    const dueDate = dueDateForAcademicMonth(academicYearStart, month);
    const existing = await db.query<{ id: number; amount_due: string; status: string }>(
      `SELECT id, amount_due, status FROM student_fees
       WHERE student_id = $1 AND fee_structure_id = $2 AND academic_year = $3 AND month = $4`,
      [studentId, feeStructureId, academicYear, month]
    );

    if (existing.rows.length > 0) {
      const rec = existing.rows[0];
      if (
        parseFloat(rec.amount_due) !== assignment.transport_fee &&
        (rec.status === 'pending' || rec.status === 'partial')
      ) {
        await db.query(
          `UPDATE student_fees SET amount_due = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [assignment.transport_fee, rec.id]
        );
        updated++;
      }
    } else {
      const ins = await db.query(
        `INSERT INTO student_fees (
          student_id, fee_structure_id, academic_year, amount_due,
          due_date, month, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
        ON CONFLICT (student_id, fee_structure_id, academic_year, month) DO NOTHING
        RETURNING id`,
        [studentId, feeStructureId, academicYear, assignment.transport_fee, dueDate, month]
      );
      if (ins.rows.length > 0) created++;
    }
  }

  return { created, updated, removed: 0 };
}

export async function cleanupOrphanedTransportFees(
  db: RequestDb,
  academicYear: string
): Promise<number> {
  const feeStructureId = await getOrCreateTransportFeeStructure(db, academicYear);
  const orphanDel = await db.query(
    `DELETE FROM student_fees sf
     WHERE sf.fee_structure_id = $1
     AND sf.academic_year = $2
     AND sf.status IN ('pending', 'partial')
     AND NOT EXISTS (
       SELECT 1 FROM student_transport st
       WHERE st.student_id = sf.student_id AND st.status = 'active'
     )`,
    [feeStructureId, academicYear]
  );
  return orphanDel.rowCount || 0;
}

export async function syncTransportFees(
  db: RequestDb,
  academicYear: string,
  studentId?: number
): Promise<{ students_processed: number; created: number; updated: number; removed: number }> {
  let studentIds: number[];

  if (studentId) {
    studentIds = [studentId];
  } else {
    const rows = await db.query<{ student_id: number }>(
      `SELECT DISTINCT student_id FROM student_transport
       WHERE status = 'active' AND transport_fee IS NOT NULL AND transport_fee > 0`
    );
    studentIds = rows.rows.map((r) => r.student_id);
  }

  let created = 0;
  let updated = 0;
  let removed = 0;

  for (const sid of studentIds) {
    const result = await syncTransportFeesForStudent(db, sid, academicYear);
    created += result.created;
    updated += result.updated;
    removed += result.removed;
  }

  removed += await cleanupOrphanedTransportFees(db, academicYear);

  return {
    students_processed: studentIds.length,
    created,
    updated,
    removed,
  };
}
