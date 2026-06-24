import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { parseStudentId, studentExists } from '@/lib/student-profile-api';
import {
  getStudentMessagingSettings,
  upsertStudentMessagingSettings,
} from '@/lib/student-messaging';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { db } = await getRequestDb(request);
    const studentId = parseStudentId(params.id);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }
    if (!(await studentExists(db, studentId))) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const settings = await getStudentMessagingSettings(db, studentId);
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching student messaging settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messaging settings' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { db } = await getRequestDb(request);
    const studentId = parseStudentId(params.id);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }
    if (!(await studentExists(db, studentId))) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const body = await request.json();
    const settings = await upsertStudentMessagingSettings(db, studentId, {
      automation_enabled: body.automation_enabled,
      exclude_fee_reminders: body.exclude_fee_reminders,
      exclude_attendance_alerts: body.exclude_attendance_alerts,
      exclude_homework_reminders: body.exclude_homework_reminders,
      exclude_exam_results: body.exclude_exam_results,
      exclude_promotional: body.exclude_promotional,
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error updating student messaging settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update messaging settings' },
      { status: 500 },
    );
  }
}
