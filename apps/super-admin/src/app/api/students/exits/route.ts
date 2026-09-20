import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentExitSchema } from '@/lib/ensure-student-exit-schema';
import {
  getExitReasonLabel,
  isValidExitReasonCode,
} from '@/lib/student-exit-utils';
import {
  getActiveExitForStudent,
  initiateStudentExit,
  listStudentExits,
} from '@/lib/student-exit-service';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureStudentExitSchema(db);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const studentIdRaw = searchParams.get('student_id');
    const activeOnly = searchParams.get('active') === 'true';

    if (studentIdRaw && activeOnly) {
      const studentId = parseInt(studentIdRaw, 10);
      if (!Number.isNaN(studentId)) {
        const activeExit = await getActiveExitForStudent(db, studentId);
        return NextResponse.json({ success: true, data: activeExit });
      }
    }

    const studentId = studentIdRaw ? parseInt(studentIdRaw, 10) : undefined;

    const { items, total } = await listStudentExits(db, {
      page,
      limit,
      search,
      status,
      studentId: studentId && !Number.isNaN(studentId) ? studentId : undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching student exits:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student exits' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db, user } = authResult;

    await ensureStudentExitSchema(db);

    const body = await request.json();
    const studentId = parseInt(String(body.student_id), 10);
    const exitReasonCode = String(body.exit_reason_code || '').trim();
    const exitDate = String(body.exit_date || '').trim();
    const remarks = body.remarks ? String(body.remarks) : '';

    if (!studentId || Number.isNaN(studentId)) {
      return NextResponse.json({ success: false, error: 'Valid student_id is required' }, { status: 400 });
    }

    if (!isValidExitReasonCode(exitReasonCode)) {
      return NextResponse.json({ success: false, error: 'Valid exit reason is required' }, { status: 400 });
    }

    if (!exitDate) {
      return NextResponse.json({ success: false, error: 'Exit date is required' }, { status: 400 });
    }

    const issuerName =
      (user as { full_name?: string }).full_name || user.email || `User #${user.id}`;

    const exitRecord = await initiateStudentExit(db, {
      studentId,
      exitReasonCode,
      exitReasonLabel: getExitReasonLabel(exitReasonCode),
      exitDate,
      remarks,
      initiatedBy: user.id,
      initiatedByName: issuerName,
    });

    return NextResponse.json({ success: true, data: exitRecord });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initiate student exit';
    console.error('Error initiating student exit:', error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
