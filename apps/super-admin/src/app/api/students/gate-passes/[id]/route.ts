import { NextRequest, NextResponse } from 'next/server';
import { hasRole } from '@edulakhya/auth';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureGatePassSchema } from '@/lib/ensure-gate-pass-schema';
import {
  enrichGatePassStudentSnapshot,
  GATE_PASS_APPROVER_ROLES,
  isValidCollectorRelationship,
} from '@/lib/gate-pass-utils';

async function requireGatePassAdmin(user: { role?: string | null }) {
  if (!hasRole(user.role || '', [...GATE_PASS_APPROVER_ROLES])) {
    return NextResponse.json(
      { success: false, error: 'Only administrators can modify gate passes' },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureGatePassSchema(db);

    const id = parseInt(params.id, 10);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const result = await db.query('SELECT * FROM student_gate_passes WHERE id = $1', [id]);
    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ success: false, error: 'Gate pass not found' }, { status: 404 });
    }

    const snapshot = await enrichGatePassStudentSnapshot(
      db,
      row.student_id as number,
      (row.student_snapshot as Record<string, unknown>) || {}
    );

    return NextResponse.json({
      success: true,
      data: { ...row, student_snapshot: snapshot },
    });
  } catch (error) {
    console.error('Error fetching gate pass:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gate pass' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db, user } = authResult;

    const denied = await requireGatePassAdmin(user);
    if (denied) return denied;

    await ensureGatePassSchema(db);

    const id = parseInt(params.id, 10);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const existingResult = await db.query<{ status: string }>(
      'SELECT status FROM student_gate_passes WHERE id = $1',
      [id]
    );
    if (!existingResult.rows[0]) {
      return NextResponse.json({ success: false, error: 'Gate pass not found' }, { status: 404 });
    }

    const body = await request.json();
    const isPending = existingResult.rows[0].status === 'pending';

    const reason = body.reason !== undefined ? String(body.reason).trim() : undefined;
    const notes = body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : undefined;

    if (reason !== undefined && !reason) {
      return NextResponse.json({ success: false, error: 'Reason cannot be empty' }, { status: 400 });
    }

    let collectorName: string | undefined;
    let collectorMobile: string | undefined;
    let collectorRelationship: string | undefined;
    let collectorPhotoUrl: string | null | undefined;

    if (isPending) {
      if (body.collector_name !== undefined) {
        collectorName = String(body.collector_name).trim();
        if (!collectorName) {
          return NextResponse.json(
            { success: false, error: 'Collector name is required' },
            { status: 400 }
          );
        }
      }
      if (body.collector_mobile !== undefined) {
        collectorMobile = String(body.collector_mobile).trim();
        if (!collectorMobile) {
          return NextResponse.json(
            { success: false, error: 'Collector mobile is required' },
            { status: 400 }
          );
        }
      }
      if (body.collector_relationship !== undefined) {
        collectorRelationship = String(body.collector_relationship);
        if (!isValidCollectorRelationship(collectorRelationship)) {
          return NextResponse.json(
            { success: false, error: 'Invalid collector relationship' },
            { status: 400 }
          );
        }
      }
      if (body.collector_photo_url !== undefined) {
        collectorPhotoUrl = body.collector_photo_url
          ? String(body.collector_photo_url).trim()
          : null;
      }
    } else if (
      body.collector_name !== undefined ||
      body.collector_mobile !== undefined ||
      body.collector_relationship !== undefined ||
      body.collector_photo_url !== undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Collector details can only be edited while the gate pass is pending',
        },
        { status: 400 }
      );
    }

    const updateResult = await db.query(
      `UPDATE student_gate_passes
       SET
         collector_name = COALESCE($2, collector_name),
         collector_mobile = COALESCE($3, collector_mobile),
         collector_relationship = COALESCE($4, collector_relationship),
         collector_photo_url = CASE WHEN $5::boolean THEN $6 ELSE collector_photo_url END,
         reason = COALESCE($7, reason),
         notes = CASE WHEN $8::boolean THEN $9 ELSE notes END
       WHERE id = $1
       RETURNING *`,
      [
        id,
        collectorName ?? null,
        collectorMobile ?? null,
        collectorRelationship ?? null,
        collectorPhotoUrl !== undefined,
        collectorPhotoUrl ?? null,
        reason ?? null,
        notes !== undefined,
        notes ?? null,
      ]
    );

    const row = updateResult.rows[0];
    const snapshot = await enrichGatePassStudentSnapshot(
      db,
      row.student_id as number,
      (row.student_snapshot as Record<string, unknown>) || {}
    );

    return NextResponse.json({
      success: true,
      data: { ...row, student_snapshot: snapshot },
    });
  } catch (error) {
    console.error('Error updating gate pass:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update gate pass' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db, user } = authResult;

    const denied = await requireGatePassAdmin(user);
    if (denied) return denied;

    await ensureGatePassSchema(db);

    const id = parseInt(params.id, 10);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const deleteResult = await db.query(
      'DELETE FROM student_gate_passes WHERE id = $1 RETURNING id, pass_number',
      [id]
    );

    if (!deleteResult.rows[0]) {
      return NextResponse.json({ success: false, error: 'Gate pass not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: deleteResult.rows[0] });
  } catch (error) {
    console.error('Error deleting gate pass:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete gate pass' },
      { status: 500 }
    );
  }
}
