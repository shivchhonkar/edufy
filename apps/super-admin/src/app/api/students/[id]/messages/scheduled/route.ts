import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { parseStudentId, studentExists } from '@/lib/student-profile-api';
import { ensureStudentMessagingSchema } from '@/lib/ensure-student-messaging-schema';
import {
  processDueScheduledMessages,
  type MessageRecipientTarget,
} from '@/lib/student-messaging';
import type { SmsType } from '@/lib/two-factor-sms';

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

    await processDueScheduledMessages(db, studentId);

    const result = await db.query(
      `SELECT id, title, message, sms_type, recipient_target, scheduled_at, status, sent_at, error_message
       FROM student_scheduled_messages
       WHERE student_id = $1 AND status IN ('pending', 'failed')
       ORDER BY scheduled_at ASC
       LIMIT 20`,
      [studentId],
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching scheduled messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scheduled messages' },
      { status: 500 },
    );
  }
}

export async function POST(
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

    await ensureStudentMessagingSchema(db);
    const body = await request.json();
    const title = String(body.title || '').trim();
    const message = String(body.message || '').trim();
    const scheduledAt = String(body.scheduled_at || '').trim();
    const smsType = (body.sms_type || 'transactional') as SmsType;
    const recipientTarget = (body.recipient_target || 'all') as MessageRecipientTarget;

    if (!title || !message || !scheduledAt) {
      return NextResponse.json(
        { success: false, error: 'Title, message, and scheduled date/time are required' },
        { status: 400 },
      );
    }

    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid scheduled date/time' }, { status: 400 });
    }
    if (scheduledDate.getTime() <= Date.now()) {
      return NextResponse.json(
        { success: false, error: 'Scheduled time must be in the future' },
        { status: 400 },
      );
    }

    const result = await db.query(
      `INSERT INTO student_scheduled_messages (
        student_id, title, message, sms_type, recipient_target, scheduled_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [studentId, title, message, smsType, recipientTarget, scheduledDate.toISOString()],
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Message scheduled successfully',
    });
  } catch (error) {
    console.error('Error scheduling student message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to schedule message' },
      { status: 500 },
    );
  }
}
