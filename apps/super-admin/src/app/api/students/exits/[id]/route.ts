import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { hasRole } from '@/lib/auth';
import { ensureStudentExitSchema } from '@/lib/ensure-student-exit-schema';
import { PRINCIPAL_APPROVER_ROLES } from '@/lib/student-exit-utils';
import {
  approveClearanceDepartment,
  approvePrincipalExit,
  cancelStudentExit,
  completeStudentExit,
  getExitById,
  startExitClearance,
  updateExitCertificates,
} from '@/lib/student-exit-service';

function parseExitId(raw: string): number | null {
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureStudentExitSchema(db);

    const exitId = parseExitId(params.id);
    if (!exitId) {
      return NextResponse.json({ success: false, error: 'Invalid exit id' }, { status: 400 });
    }

    const exitRecord = await getExitById(db, exitId);
    if (!exitRecord) {
      return NextResponse.json({ success: false, error: 'Exit record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: exitRecord });
  } catch (error) {
    console.error('Error fetching student exit:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student exit' },
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

    await ensureStudentExitSchema(db);

    const exitId = parseExitId(params.id);
    if (!exitId) {
      return NextResponse.json({ success: false, error: 'Invalid exit id' }, { status: 400 });
    }

    const body = await request.json();
    const action = String(body.action || '').trim();
    const approverName =
      (user as { full_name?: string }).full_name || user.email || `User #${user.id}`;

    let exitRecord;

    switch (action) {
      case 'start_clearance': {
        exitRecord = await startExitClearance(db, exitId);
        break;
      }

      case 'approve_clearance': {
        const department = String(body.department || '').trim();
        if (!department) {
          return NextResponse.json(
            { success: false, error: 'Department is required' },
            { status: 400 }
          );
        }
        exitRecord = await approveClearanceDepartment(
          db,
          exitId,
          department,
          { id: user.id, name: approverName },
          body.notes ? String(body.notes) : undefined
        );
        break;
      }

      case 'principal_approve': {
        if (!hasRole(user.role, [...PRINCIPAL_APPROVER_ROLES])) {
          return NextResponse.json(
            { success: false, error: 'Only principal or admin can approve exit' },
            { status: 403 }
          );
        }
        exitRecord = await approvePrincipalExit(db, exitId, {
          id: user.id,
          name: approverName,
        });
        break;
      }

      case 'update_certificates': {
        exitRecord = await updateExitCertificates(db, exitId, {
          transfer_certificate: Boolean(body.transfer_certificate),
          character_certificate: Boolean(body.character_certificate),
          bonafide: Boolean(body.bonafide),
          tc_generation_id: body.tc_generation_id ?? null,
        });
        break;
      }

      case 'complete': {
        exitRecord = await completeStudentExit(db, exitId, {
          id: user.id,
          name: approverName,
        });
        break;
      }

      case 'cancel': {
        exitRecord = await cancelStudentExit(
          db,
          exitId,
          body.reason ? String(body.reason) : undefined
        );
        break;
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: exitRecord });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update student exit';
    console.error('Error updating student exit:', error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
