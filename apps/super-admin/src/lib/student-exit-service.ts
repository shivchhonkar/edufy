import type { RequestDb } from '@/lib/request-db';
import type { Student } from '@/shared/types';
import { buildStudentSnapshot } from '@/features/students/utils/transfer-certificate-record';
import { studentFullName } from '@/features/students/utils/student-profile';
import {
  allClearancesApproved,
  buildInitialClearance,
  isActiveExitStatus,
  mapExitReasonToEnrollmentStatus,
  mapExitReasonToStudentStatus,
  type ExitCertificates,
  type ExitClearanceMap,
  type ExitReasonCode,
  type ExitStatus,
  type StudentExitRecord,
} from '@/lib/student-exit-utils';
import { runStudentExitValidation } from '@/lib/student-exit-validation';
import { syncAlumniProfileForStudent } from '@/lib/alumni-service';

function parseExitRow(row: Record<string, unknown>): StudentExitRecord {
  return {
    id: row.id as number,
    student_id: row.student_id as number,
    exit_reason_code: row.exit_reason_code as ExitReasonCode,
    exit_reason_label: row.exit_reason_label as string,
    exit_date: String(row.exit_date).slice(0, 10),
    remarks: (row.remarks as string | null) ?? null,
    status: row.status as ExitStatus,
    validation_snapshot: (row.validation_snapshot as StudentExitRecord['validation_snapshot']) || {
      items: [],
      validated_at: '',
      has_blockers: false,
    },
    clearance: (row.clearance as ExitClearanceMap) || {},
    certificates: (row.certificates as ExitCertificates) || {},
    student_snapshot: (row.student_snapshot as Record<string, unknown>) || {},
    initiated_by: (row.initiated_by as number | null) ?? null,
    initiated_by_name: (row.initiated_by_name as string | null) ?? null,
    initiated_at: String(row.initiated_at),
    validated_at: row.validated_at ? String(row.validated_at) : null,
    clearance_completed_at: row.clearance_completed_at ? String(row.clearance_completed_at) : null,
    principal_approved_by: (row.principal_approved_by as number | null) ?? null,
    principal_approved_by_name: (row.principal_approved_by_name as string | null) ?? null,
    principal_approved_at: row.principal_approved_at ? String(row.principal_approved_at) : null,
    completed_at: row.completed_at ? String(row.completed_at) : null,
    cancelled_at: row.cancelled_at ? String(row.cancelled_at) : null,
    cancel_reason: (row.cancel_reason as string | null) ?? null,
  };
}

export async function fetchStudentForExit(
  db: RequestDb,
  studentId: number
): Promise<(Student & { class_name?: string; section_name?: string }) | null> {
  const result = await db.query<Student & { class_name?: string; section_name?: string }>(
    `SELECT s.*, c.name AS class_name, sec.name AS section_name
     FROM students s
     LEFT JOIN classes c ON s.class_id = c.id
     LEFT JOIN sections sec ON s.section_id = sec.id
     WHERE s.id = $1`,
    [studentId]
  );
  return result.rows[0] ?? null;
}

export async function getActiveExitForStudent(
  db: RequestDb,
  studentId: number
): Promise<StudentExitRecord | null> {
  const result = await db.query(
    `SELECT * FROM student_exits
     WHERE student_id = $1
       AND status NOT IN ('EXITED', 'CANCELLED')
     ORDER BY initiated_at DESC
     LIMIT 1`,
    [studentId]
  );
  if (result.rows.length === 0) return null;
  return parseExitRow(result.rows[0]);
}

export async function initiateStudentExit(
  db: RequestDb,
  options: {
    studentId: number;
    exitReasonCode: ExitReasonCode;
    exitReasonLabel: string;
    exitDate: string;
    remarks?: string;
    initiatedBy: number;
    initiatedByName: string;
  }
): Promise<StudentExitRecord> {
  const student = await fetchStudentForExit(db, options.studentId);
  if (!student) {
    throw new Error('Student not found');
  }

  if (student.status !== 'active') {
    throw new Error(`Student is already ${student.status}`);
  }

  const existing = await getActiveExitForStudent(db, options.studentId);
  if (existing) {
    throw new Error('An exit process is already in progress for this student');
  }

  const validation = await runStudentExitValidation(db, student);
  const clearance = buildInitialClearance(validation);
  const snapshot = buildStudentSnapshot(student);

  const autoApprovedClearance = { ...clearance };
  for (const [key, item] of Object.entries(autoApprovedClearance)) {
    if (item?.status === 'approved') {
      autoApprovedClearance[key as keyof ExitClearanceMap] = {
        ...item,
        approved_by: options.initiatedBy,
        approved_by_name: options.initiatedByName,
        approved_at: new Date().toISOString(),
        notes: 'Auto-cleared during validation',
      };
    }
  }

  const allApproved = allClearancesApproved(autoApprovedClearance);

  const insertResult = await db.query(
    `INSERT INTO student_exits (
      student_id, exit_reason_code, exit_reason_label, exit_date, remarks,
      status, validation_snapshot, clearance, certificates, student_snapshot,
      initiated_by, initiated_by_name, validated_at, clearance_completed_at
    ) VALUES ($1, $2, $3, $4, $5, 'EXIT_INITIATED', $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, CURRENT_TIMESTAMP, $12)
    RETURNING *`,
    [
      options.studentId,
      options.exitReasonCode,
      options.exitReasonLabel,
      options.exitDate,
      options.remarks?.trim() || null,
      JSON.stringify(validation),
      JSON.stringify(autoApprovedClearance),
      JSON.stringify({}),
      JSON.stringify(snapshot),
      options.initiatedBy,
      options.initiatedByName,
      allApproved ? new Date().toISOString() : null,
    ]
  );

  return parseExitRow(insertResult.rows[0]);
}

export async function startExitClearance(db: RequestDb, exitId: number): Promise<StudentExitRecord> {
  const exit = await getExitById(db, exitId);
  if (!exit) throw new Error('Exit record not found');
  if (exit.status !== 'EXIT_INITIATED') {
    throw new Error('Clearance can only start after exit is initiated');
  }

  const allApproved = allClearancesApproved(exit.clearance);
  const nextStatus: ExitStatus = allApproved ? 'PRINCIPAL_PENDING' : 'CLEARANCE_PENDING';

  const result = await db.query(
    `UPDATE student_exits
     SET status = $2,
         clearance_completed_at = CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE clearance_completed_at END
     WHERE id = $1
     RETURNING *`,
    [exitId, nextStatus, allApproved]
  );

  return parseExitRow(result.rows[0]);
}

export async function approveClearanceDepartment(
  db: RequestDb,
  exitId: number,
  department: string,
  approver: { id: number; name: string },
  notes?: string
): Promise<StudentExitRecord> {
  const exit = await getExitById(db, exitId);
  if (!exit) throw new Error('Exit record not found');
  if (!isActiveExitStatus(exit.status)) throw new Error('Exit process is no longer active');
  if (exit.status !== 'CLEARANCE_PENDING') {
    throw new Error('Clearance can only be updated while clearance is pending');
  }

  const clearance = { ...exit.clearance };
  clearance[department as keyof ExitClearanceMap] = {
    status: 'approved',
    approved_by: approver.id,
    approved_by_name: approver.name,
    approved_at: new Date().toISOString(),
    notes: notes?.trim() || undefined,
  };

  const allApproved = allClearancesApproved(clearance);
  const nextStatus: ExitStatus = allApproved ? 'PRINCIPAL_PENDING' : 'CLEARANCE_PENDING';

  const result = await db.query(
    `UPDATE student_exits
     SET clearance = $2::jsonb,
         status = $3,
         clearance_completed_at = CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE clearance_completed_at END
     WHERE id = $1
     RETURNING *`,
    [exitId, JSON.stringify(clearance), nextStatus, allApproved]
  );

  return parseExitRow(result.rows[0]);
}

export async function approvePrincipalExit(
  db: RequestDb,
  exitId: number,
  approver: { id: number; name: string }
): Promise<StudentExitRecord> {
  const exit = await getExitById(db, exitId);
  if (!exit) throw new Error('Exit record not found');
  if (exit.status !== 'PRINCIPAL_PENDING') {
    throw new Error('Principal approval is not pending for this exit');
  }

  const result = await db.query(
    `UPDATE student_exits
     SET status = 'CERTIFICATES_PENDING',
         principal_approved_by = $2,
         principal_approved_by_name = $3,
         principal_approved_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [exitId, approver.id, approver.name]
  );

  return parseExitRow(result.rows[0]);
}

export async function updateExitCertificates(
  db: RequestDb,
  exitId: number,
  certificates: ExitCertificates
): Promise<StudentExitRecord> {
  const exit = await getExitById(db, exitId);
  if (!exit) throw new Error('Exit record not found');
  if (exit.status !== 'CERTIFICATES_PENDING') {
    throw new Error('Certificates can only be updated after principal approval');
  }

  const merged = {
    ...exit.certificates,
    ...certificates,
    generated_at: certificates.generated_at ?? new Date().toISOString(),
  };

  const result = await db.query(
    `UPDATE student_exits
     SET certificates = $2::jsonb
     WHERE id = $1
     RETURNING *`,
    [exitId, JSON.stringify(merged)]
  );

  return parseExitRow(result.rows[0]);
}

export async function completeStudentExit(
  db: RequestDb,
  exitId: number,
  completedBy: { id: number; name: string }
): Promise<StudentExitRecord> {
  const exit = await getExitById(db, exitId);
  if (!exit) throw new Error('Exit record not found');
  if (exit.status !== 'CERTIFICATES_PENDING') {
    throw new Error('Exit can only be completed after principal approval and certificate step');
  }

  const studentStatus = mapExitReasonToStudentStatus(exit.exit_reason_code);
  const enrollmentStatus = mapExitReasonToEnrollmentStatus(exit.exit_reason_code);
  const exitNote = `[Exit ${new Date().toISOString().slice(0, 10)}] ${exit.exit_reason_label}${
    exit.remarks ? ` — ${exit.remarks}` : ''
  }`;

  await db.transaction(async (client) => {
    await client.query(
      `UPDATE students
       SET status = $2,
           class_id = NULL,
           section_id = NULL,
           roll_number = NULL,
           remarks = CASE
             WHEN remarks IS NULL OR TRIM(remarks) = '' THEN $3
             ELSE remarks || E'\n' || $3
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [exit.student_id, studentStatus, exitNote]
    );

    await client.query(
      `UPDATE student_enrollments
       SET is_current = false,
           status = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $1 AND is_current = true`,
      [exit.student_id, enrollmentStatus]
    );

    if (await tableExists(client, 'student_transport')) {
      await client.query(
        `UPDATE student_transport
         SET status = 'inactive', end_date = COALESCE(end_date, CURRENT_DATE)
         WHERE student_id = $1 AND status = 'active'`,
        [exit.student_id]
      );
    }

    await client.query(
      `UPDATE student_exits
       SET status = 'EXITED',
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [exitId]
    );
  });

  const updated = await getExitById(db, exitId);
  if (!updated) throw new Error('Failed to load completed exit');

  if (updated.exit_reason_code === 'COMPLETED') {
    try {
      await syncAlumniProfileForStudent(db, updated.student_id);
    } catch (error) {
      console.error('Alumni profile sync after exit failed:', error);
    }
  }

  return updated;
}

async function tableExists(
  client: { query: RequestDb['query'] },
  tableName: string
): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [tableName]
  );
  return Boolean(result.rows[0]?.exists);
}

export async function cancelStudentExit(
  db: RequestDb,
  exitId: number,
  reason?: string
): Promise<StudentExitRecord> {
  const exit = await getExitById(db, exitId);
  if (!exit) throw new Error('Exit record not found');
  if (!isActiveExitStatus(exit.status)) throw new Error('Exit process is already finished');

  const result = await db.query(
    `UPDATE student_exits
     SET status = 'CANCELLED',
         cancelled_at = CURRENT_TIMESTAMP,
         cancel_reason = $2
     WHERE id = $1
     RETURNING *`,
    [exitId, reason?.trim() || null]
  );

  return parseExitRow(result.rows[0]);
}

export async function getExitById(db: RequestDb, exitId: number): Promise<StudentExitRecord | null> {
  const result = await db.query(`SELECT * FROM student_exits WHERE id = $1`, [exitId]);
  if (result.rows.length === 0) return null;
  return parseExitRow(result.rows[0]);
}

export async function listStudentExits(
  db: RequestDb,
  options: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    studentId?: number;
  }
): Promise<{ items: StudentExitRecord[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options.search) {
    conditions.push(`(
      se.student_snapshot->>'full_name' ILIKE $${paramIndex}
      OR se.student_snapshot->>'admission_number' ILIKE $${paramIndex}
      OR se.exit_reason_label ILIKE $${paramIndex}
    )`);
    params.push(`%${options.search}%`);
    paramIndex += 1;
  }

  if (options.status) {
    conditions.push(`se.status = $${paramIndex}`);
    params.push(options.status);
    paramIndex += 1;
  }

  if (options.studentId) {
    conditions.push(`se.student_id = $${paramIndex}`);
    params.push(options.studentId);
    paramIndex += 1;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (options.page - 1) * options.limit;

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM student_exits se ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || '0', 10);

  const listResult = await db.query(
    `SELECT se.*
     FROM student_exits se
     ${whereClause}
     ORDER BY se.initiated_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, options.limit, offset]
  );

  return {
    items: listResult.rows.map((row) => parseExitRow(row)),
    total,
  };
}

export function buildExitStudentSnapshot(student: Student) {
  return {
    ...buildStudentSnapshot(student),
    class_name: student.class_name,
    section_name: student.section_name,
    status: student.status,
    display_name: studentFullName(student),
  };
}
