import type { RequestDb } from '@/lib/request-db';
import type { ResultWorkflowStatus } from '@/lib/ensure-exam-result-engine';

export async function logExamResultAudit(
  db: RequestDb,
  params: {
    exam_id: number;
    action: string;
    actor_id?: number | null;
    actor_role?: string | null;
    tenant_id?: number | null;
    previous_status?: string | null;
    new_status?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO exam_result_audit_log (
      tenant_id, exam_id, action, actor_id, actor_role,
      previous_status, new_status, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      params.tenant_id ?? null,
      params.exam_id,
      params.action,
      params.actor_id ?? null,
      params.actor_role ?? null,
      params.previous_status ?? null,
      params.new_status ?? null,
      JSON.stringify(params.metadata ?? {}),
    ],
  );
}

export async function getExamWorkflowStatus(
  db: RequestDb,
  examId: number,
): Promise<ResultWorkflowStatus> {
  const result = await db.query<{ result_workflow_status: ResultWorkflowStatus }>(
    `SELECT COALESCE(result_workflow_status, 'published') AS result_workflow_status
     FROM exams WHERE id = $1`,
    [examId],
  );
  return result.rows[0]?.result_workflow_status ?? 'published';
}

export async function transitionExamWorkflow(
  db: RequestDb,
  examId: number,
  target: ResultWorkflowStatus,
  actor: { id: number; role?: string; tenant_id?: number },
): Promise<{ previous: ResultWorkflowStatus; current: ResultWorkflowStatus }> {
  const previous = await getExamWorkflowStatus(db, examId);

  const allowed: Record<ResultWorkflowStatus, ResultWorkflowStatus[]> = {
    draft: ['under_review', 'draft'],
    under_review: ['approved', 'draft'],
    approved: ['published', 'under_review'],
    published: ['draft'],
  };

  if (!allowed[previous]?.includes(target)) {
    throw new Error(`Cannot transition from ${previous} to ${target}`);
  }

  const timestampFields: Partial<Record<ResultWorkflowStatus, string>> = {
    under_review: 'submitted_for_review_at = NOW(), submitted_for_review_by = $2',
    approved: 'approved_at = NOW(), approved_by = $2',
    published: 'published_at = NOW(), published_by = $2',
  };

  const extra = timestampFields[target];
  if (extra) {
    await db.query(
      `UPDATE exams SET result_workflow_status = $1, updated_at = NOW(), ${extra}
       WHERE id = $3`,
      [target, actor.id, examId],
    );
  } else {
    await db.query(
      `UPDATE exams SET result_workflow_status = $1, updated_at = NOW() WHERE id = $2`,
      [target, examId],
    );
  }

  await logExamResultAudit(db, {
    exam_id: examId,
    action: `workflow_${target}`,
    actor_id: actor.id,
    actor_role: actor.role,
    tenant_id: actor.tenant_id,
    previous_status: previous,
    new_status: target,
  });

  return { previous, current: target };
}

export async function publishExamSummaries(
  db: RequestDb,
  examId: number,
  actorId: number,
): Promise<number> {
  const result = await db.query(
    `UPDATE student_exam_summary
     SET publish_status = 'published', published_at = NOW(), published_by = $2, updated_at = NOW()
     WHERE exam_id = $1 AND publish_status = 'draft'`,
    [examId, actorId],
  );
  return result.rowCount ?? 0;
}

export async function unpublishExamSummaries(db: RequestDb, examId: number): Promise<number> {
  const result = await db.query(
    `UPDATE student_exam_summary
     SET publish_status = 'draft', published_at = NULL, published_by = NULL, updated_at = NOW()
     WHERE exam_id = $1 AND publish_status = 'published'`,
    [examId],
  );
  return result.rowCount ?? 0;
}
