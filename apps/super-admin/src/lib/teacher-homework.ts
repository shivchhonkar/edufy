import type { RequestDb } from '@/lib/request-db';

export type TeacherHomeworkSubmissionRow = {
  id: number;
  homework_id: number;
  student_id: number;
  submission_text?: string | null;
  submission_file?: string | null;
  submission_url?: string | null;
  submission_date?: string | null;
  submitted_at?: string | null;
  remarks?: string | null;
  feedback?: string | null;
  marks_obtained?: number | null;
  status?: string | null;
  graded_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  admission_number?: string | null;
  roll_number?: string | null;
};

function isMissingColumnError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('column') && message.includes('does not exist');
}

function isCheckConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('check constraint') || message.includes('violates check');
}

export async function ensureHomeworkReviewSchema(db: RequestDb): Promise<void> {
  const columns = [
    'ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS submission_text TEXT',
    'ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS submission_file TEXT',
    'ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP',
    'ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS feedback TEXT',
    'ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP',
    'ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  ];

  for (const statement of columns) {
    await db.query(statement);
  }

  const constraints = await db.query<{ conname: string }>(
    `SELECT c.conname
     FROM pg_constraint c
     JOIN pg_class t ON c.conrelid = t.oid
     JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
     WHERE t.relname = 'homework_submissions'
       AND c.contype = 'c'
       AND a.attname = 'status'`,
  );

  for (const row of constraints.rows) {
    await db.query(`ALTER TABLE homework_submissions DROP CONSTRAINT IF EXISTS "${row.conname}"`);
  }

  await db.query(`ALTER TABLE homework_submissions DROP CONSTRAINT IF EXISTS homework_submissions_status_check`);

  try {
    await db.query(`
      ALTER TABLE homework_submissions ADD CONSTRAINT homework_submissions_status_check
      CHECK (status IN ('pending', 'submitted', 'graded', 'late', 'rejected', 'resubmit_requested'))
    `);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.toLowerCase().includes('already exists')) {
      throw error;
    }
  }
}

export function normalizeTeacherSubmissionRow(row: TeacherHomeworkSubmissionRow) {
  const submissionFile = row.submission_file ?? row.submission_url ?? null;
  return {
    id: Number(row.id),
    homework_id: Number(row.homework_id),
    student_id: Number(row.student_id),
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    admission_number: row.admission_number ?? null,
    roll_number: row.roll_number ?? null,
    submission_text: row.submission_text ?? row.remarks ?? null,
    submission_file: submissionFile,
    submitted_at: row.submitted_at ?? row.submission_date ?? null,
    marks_obtained: row.marks_obtained ?? null,
    feedback: row.feedback ?? row.remarks ?? null,
    status: row.status ?? 'pending',
    graded_at: row.graded_at ?? null,
  };
}

export function buildSubmissionStats(
  submissions: Array<{ status?: string | null }>,
) {
  const pending = submissions.filter((row) => row.status === 'pending').length;
  const submitted = submissions.filter((row) => row.status === 'submitted').length;
  const graded = submissions.filter((row) => row.status === 'graded').length;
  const rejected = submissions.filter((row) => row.status === 'rejected').length;
  const resubmit_requested = submissions.filter((row) => row.status === 'resubmit_requested').length;

  return {
    total: submissions.length,
    pending,
    submitted,
    graded,
    rejected,
    resubmit_requested,
  };
}

export async function fetchHomeworkSubmissionsForTeacher(
  db: RequestDb,
  homeworkId: number,
) {
  try {
    return await db.query<TeacherHomeworkSubmissionRow>(
      `SELECT
        hs.*,
        st.first_name,
        st.last_name,
        st.admission_number,
        st.roll_number
      FROM homework_submissions hs
      JOIN students st ON hs.student_id = st.id
      WHERE hs.homework_id = $1
      ORDER BY st.roll_number NULLS LAST, st.first_name, st.last_name`,
      [homeworkId],
    );
  } catch {
    return await db.query<TeacherHomeworkSubmissionRow>(
      `SELECT
        hs.*,
        hs.submission_date AS submitted_at,
        hs.remarks AS feedback,
        hs.submission_url AS submission_file,
        st.first_name,
        st.last_name,
        st.admission_number,
        st.roll_number
      FROM homework_submissions hs
      JOIN students st ON hs.student_id = st.id
      WHERE hs.homework_id = $1
      ORDER BY st.roll_number NULLS LAST, st.first_name, st.last_name`,
      [homeworkId],
    );
  }
}

export type TeacherSubmissionAction = 'grade' | 'reject' | 'request_resubmit';

async function updateSubmissionRow(
  db: RequestDb,
  submissionId: number,
  fields: {
    status: string;
    feedback?: string | null;
    marks_obtained?: number | null;
    graded_by?: number | null;
    clearGrade?: boolean;
  },
) {
  const params: unknown[] = [];
  const updates: string[] = [];
  let paramIndex = 0;

  const push = (sql: string, value: unknown) => {
    paramIndex += 1;
    updates.push(`${sql} = $${paramIndex}`);
    params.push(value);
  };

  if (fields.feedback !== undefined) {
    push('feedback', fields.feedback);
  }

  push('status', fields.status);

  if (fields.clearGrade) {
    push('marks_obtained', null);
    push('graded_by', null);
    push('graded_at', null);
  } else {
    if (fields.marks_obtained !== undefined) {
      push('marks_obtained', fields.marks_obtained);
    }
    if (fields.graded_by != null) {
      push('graded_by', fields.graded_by);
      push('graded_at', new Date().toISOString());
    }
  }

  paramIndex += 1;
  updates.push(`updated_at = $${paramIndex}`);
  params.push(new Date().toISOString());

  paramIndex += 1;
  params.push(submissionId);

  try {
    return await db.query(
      `UPDATE homework_submissions
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params,
    );
  } catch (error) {
    if (!isMissingColumnError(error)) {
      throw error;
    }

    const legacyUpdates: string[] = [];
    const legacyParams: unknown[] = [];
    let legacyIndex = 0;
    const legacyPush = (sql: string, value: unknown) => {
      legacyIndex += 1;
      legacyUpdates.push(`${sql} = $${legacyIndex}`);
      legacyParams.push(value);
    };

    if (fields.feedback !== undefined) {
      legacyPush('remarks', fields.feedback);
    }
    legacyPush('status', fields.status);
    if (fields.clearGrade) {
      legacyPush('marks_obtained', null);
      legacyPush('graded_by', null);
    } else {
      if (fields.marks_obtained !== undefined) {
        legacyPush('marks_obtained', fields.marks_obtained);
      }
      if (fields.graded_by != null) {
        legacyPush('graded_by', fields.graded_by);
      }
    }

    legacyIndex += 1;
    legacyParams.push(submissionId);

    return await db.query(
      `UPDATE homework_submissions
       SET ${legacyUpdates.join(', ')}
       WHERE id = $${legacyIndex}
       RETURNING *`,
      legacyParams,
    );
  }
}

export async function applyTeacherSubmissionAction(
  db: RequestDb,
  submissionId: number,
  teacherUserId: number,
  payload: {
    action: TeacherSubmissionAction;
    marks_obtained?: number | null;
    feedback?: string | null;
  },
) {
  await ensureHomeworkReviewSchema(db);

  const feedback = payload.feedback?.trim() ?? '';

  if (payload.action === 'grade') {
    if (payload.marks_obtained == null || Number.isNaN(Number(payload.marks_obtained))) {
      throw new Error('Marks are required to grade a submission');
    }

    return updateSubmissionRow(db, submissionId, {
      status: 'graded',
      feedback: feedback || null,
      marks_obtained: payload.marks_obtained,
      graded_by: teacherUserId,
    });
  }

  if (!feedback) {
    throw new Error('Feedback is required when rejecting or requesting resubmission');
  }

  const nextStatus = payload.action === 'reject' ? 'rejected' : 'resubmit_requested';

  try {
    return await updateSubmissionRow(db, submissionId, {
      status: nextStatus,
      feedback,
      clearGrade: true,
    });
  } catch (error) {
    if (!isCheckConstraintError(error)) {
      throw error;
    }

    // Last-resort fallback for tenants where status constraint could not be migrated yet.
    const prefix = payload.action === 'reject' ? '[Rejected] ' : '[Resubmit required] ';
    return updateSubmissionRow(db, submissionId, {
      status: 'pending',
      feedback: `${prefix}${feedback}`,
      clearGrade: true,
    });
  }
}
