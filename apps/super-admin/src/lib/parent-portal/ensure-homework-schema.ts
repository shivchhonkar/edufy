import type { RequestDb } from '@/lib/request-db';

export type HomeworkAttachment = { filename?: string; url?: string; type?: string };

export function parseHomeworkAttachments(
  attachmentsRaw: unknown,
  attachmentUrl?: string | null,
): HomeworkAttachment[] {
  if (attachmentsRaw) {
    if (Array.isArray(attachmentsRaw)) {
      return attachmentsRaw as HomeworkAttachment[];
    }
    if (typeof attachmentsRaw === 'string') {
      try {
        const parsed = JSON.parse(attachmentsRaw);
        if (Array.isArray(parsed)) return parsed as HomeworkAttachment[];
      } catch {
        /* fall through */
      }
    }
  }

  if (attachmentUrl) {
    const filename = attachmentUrl.split('/').pop() || 'Attachment';
    return [{ url: attachmentUrl, filename, type: 'file' }];
  }

  return [];
}

export function buildHomeworkStats(rows: Array<{ submission_status?: string | null }>) {
  const pending = rows.filter((row) => row.submission_status === 'pending').length;
  const submitted = rows.filter((row) => row.submission_status === 'submitted').length;
  const completed = rows.filter((row) => row.submission_status === 'graded').length;

  return {
    total: rows.length,
    pending,
    submitted,
    completed,
  };
}

export function buildHomeworkListResponse(items: Array<Record<string, unknown>>) {
  const stats = buildHomeworkStats(items);
  const hasAssignments = stats.total > 0;

  return {
    items,
    stats,
    has_assignments: hasAssignments,
    assignment_status: hasAssignments ? 'assigned' : 'not_assigned',
    message: hasAssignments
      ? undefined
      : 'No homework has been assigned to this class yet.',
  };
}

export function normalizeHomeworkRow(row: Record<string, unknown>) {
  const attachmentUrl = typeof row.attachment_url === 'string' ? row.attachment_url : null;

  return {
    ...row,
    submission_text: row.submission_text ?? row.remarks ?? null,
    submission_file: row.submission_file ?? row.submission_url ?? null,
    submitted_at: row.submitted_at ?? row.submission_date ?? null,
    feedback: row.feedback ?? null,
    graded_at: row.graded_at ?? null,
    attachments: parseHomeworkAttachments(row.attachments, attachmentUrl),
  };
}

/** Base schema columns only — avoids optional migration columns on the read path. */
export const HOMEWORK_LIST_SQL = `
  SELECT
    h.id,
    h.title,
    h.description,
    h.assigned_date,
    h.due_date,
    h.total_marks,
    h.attachment_url,
    s.name AS subject_name,
    c.name AS class_name,
    u.full_name AS assigned_by_name,
    hs.id AS submission_id,
    hs.submission_url,
    hs.submission_date,
    hs.remarks,
    hs.marks_obtained,
    hs.status AS submission_status
  FROM homework h
  LEFT JOIN subjects s ON h.subject_id = s.id
  LEFT JOIN classes c ON h.class_id = c.id
  LEFT JOIN users u ON h.assigned_by = u.id
  LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = $1
  WHERE h.class_id = $2
  ORDER BY h.due_date DESC, h.created_at DESC
  LIMIT 100
`;

export const HOMEWORK_DETAIL_SQL = `
  SELECT
    h.id,
    h.title,
    h.description,
    h.assigned_date,
    h.due_date,
    h.total_marks,
    h.attachment_url,
    s.name AS subject_name,
    c.name AS class_name,
    u.full_name AS assigned_by_name,
    hs.id AS submission_id,
    hs.submission_url,
    hs.submission_date,
    hs.remarks,
    hs.marks_obtained,
    hs.status AS submission_status
  FROM homework h
  LEFT JOIN subjects s ON h.subject_id = s.id
  LEFT JOIN classes c ON h.class_id = c.id
  LEFT JOIN users u ON h.assigned_by = u.id
  LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = $1
  WHERE h.id = $2
`;

export async function ensureMissingHomeworkSubmissions(
  db: RequestDb,
  studentId: number,
  classId: number,
): Promise<void> {
  await db.query(
    `INSERT INTO homework_submissions (homework_id, student_id, status)
     SELECT h.id, $1, 'pending'
     FROM homework h
     WHERE h.class_id = $2
       AND NOT EXISTS (
         SELECT 1 FROM homework_submissions hs
         WHERE hs.homework_id = h.id AND hs.student_id = $1
       )`,
    [studentId, classId],
  );
}

export async function submitHomeworkUpdate(
  db: RequestDb,
  submissionText: string,
  submissionId: number,
) {
  try {
    return await db.query(
      `UPDATE homework_submissions
       SET submission_text = $1,
           submitted_at = CURRENT_TIMESTAMP,
           status = 'submitted'
       WHERE id = $2
       RETURNING *`,
      [submissionText, submissionId],
    );
  } catch {
    return await db.query(
      `UPDATE homework_submissions
       SET remarks = $1,
           submission_date = CURRENT_TIMESTAMP,
           status = 'submitted'
       WHERE id = $2
       RETURNING *`,
      [submissionText, submissionId],
    );
  }
}
