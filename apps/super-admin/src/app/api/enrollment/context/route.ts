import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import {
  getCurrentEnrollment,
  listStudentEnrollments,
  prepareEnrollmentSchema,
  resolveEnrollment,
  runEnrollmentBackfill,
} from '@/lib/enrollment-service';
import { getActiveAcademicYear } from '@/lib/promotion-service';

/** Active session context for UI (enrollment-centric). */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await prepareEnrollmentSchema(db);

    const studentIdParam = request.nextUrl.searchParams.get('student_id');
    const academicYearIdParam = request.nextUrl.searchParams.get('academic_year_id');
    const academicYearParam = request.nextUrl.searchParams.get('academic_year');

    const activeYear = await getActiveAcademicYear(db);

    if (studentIdParam) {
      const studentId = parseInt(studentIdParam, 10);
      if (!Number.isFinite(studentId)) {
        return NextResponse.json({ success: false, error: 'Invalid student_id' }, { status: 400 });
      }

      const enrollment = await resolveEnrollment(db, studentId, {
        academicYearId: academicYearIdParam ? parseInt(academicYearIdParam, 10) : undefined,
        academicYear: academicYearParam,
      });

      const history = await listStudentEnrollments(db, studentId);

      return NextResponse.json({
        success: true,
        data: {
          active_academic_year: activeYear,
          enrollment,
          enrollments: history,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        active_academic_year: activeYear,
        enrollment: null,
      },
    });
  } catch (error) {
    console.error('Error fetching enrollment context:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch enrollment context' },
      { status: 500 }
    );
  }
}

/** Run enrollment backfill (admin). */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db, user } = authResult;

    const role = user.role?.toLowerCase() ?? '';
    if (!['super_admin', 'admin', 'administrator'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const stats = await runEnrollmentBackfill(db);

    return NextResponse.json({
      success: true,
      data: stats,
      message: 'Enrollment backfill completed',
    });
  } catch (error) {
    console.error('Enrollment backfill failed:', error);
    return NextResponse.json(
      { success: false, error: 'Enrollment backfill failed' },
      { status: 500 }
    );
  }
}

/** Current enrollment for one student. */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    const body = await request.json();
    const studentId = parseInt(String(body.student_id), 10);
    if (!Number.isFinite(studentId)) {
      return NextResponse.json({ success: false, error: 'student_id required' }, { status: 400 });
    }

    const enrollment = await getCurrentEnrollment(db, studentId);
    return NextResponse.json({ success: true, data: enrollment });
  } catch (error) {
    console.error('Error resolving current enrollment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve enrollment' },
      { status: 500 }
    );
  }
}
