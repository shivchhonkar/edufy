import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureAdmissionInquirySchema } from '@/lib/ensure-admission-inquiry-schema';
import {
  INQUIRY_FROM_JOIN,
  INQUIRY_SELECT,
  inquiryExists,
  isValidInquirySource,
  isValidInquiryStatus,
  isValidParentRelation,
  logInquiryActivity,
} from '@/lib/admission-inquiry-api';

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureAdmissionInquirySchema(db);
    const inquiryId = parseId(params.id);
    if (!inquiryId) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const inquiry = await db.query(
      `SELECT ${INQUIRY_SELECT} ${INQUIRY_FROM_JOIN} WHERE i.id = $1`,
      [inquiryId]
    );

    if (inquiry.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Inquiry not found' }, { status: 404 });
    }

    const activities = await db.query(
      `SELECT * FROM admission_inquiry_activities
       WHERE inquiry_id = $1 ORDER BY created_at DESC`,
      [inquiryId]
    );

    return NextResponse.json({
      success: true,
      data: { inquiry: inquiry.rows[0], activities: activities.rows },
    });
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inquiry' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureAdmissionInquirySchema(db);
    const inquiryId = parseId(params.id);
    if (!inquiryId) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    if (!(await inquiryExists(db, inquiryId))) {
      return NextResponse.json({ success: false, error: 'Inquiry not found' }, { status: 404 });
    }

    const body = await request.json();
    const current = await db.query<{ status: string; converted_student_id: number | null }>(
      'SELECT status, converted_student_id FROM admission_inquiries WHERE id = $1',
      [inquiryId]
    );
    const oldStatus = current.rows[0]?.status;
    const convertedStudentId = current.rows[0]?.converted_student_id;

    if (body.status === 'enrolled' && !convertedStudentId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Use "Convert to Student" to enroll — this creates the student record on the Students page.',
        },
        { status: 400 }
      );
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const allowed = [
      'student_first_name',
      'student_last_name',
      'date_of_birth',
      'gender',
      'parent_relation',
      'parent_name',
      'parent_phone',
      'parent_email',
      'address',
      'city',
      'state',
      'pincode',
      'interested_class_id',
      'academic_year',
      'source',
      'status',
      'priority',
      'follow_up_date',
      'remarks',
    ] as const;

    if (
      convertedStudentId &&
      body.interested_class_id !== undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Class interest cannot be changed after enrollment. Update the class on the Students page instead.',
        },
        { status: 400 }
      );
    }

    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'status' && body[key] && !isValidInquiryStatus(body[key])) {
          return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
        }
        if (key === 'source' && body[key] && !isValidInquirySource(body[key])) {
          return NextResponse.json({ success: false, error: 'Invalid source' }, { status: 400 });
        }
        if (key === 'parent_relation' && body[key] && !isValidParentRelation(body[key])) {
          return NextResponse.json(
            { success: false, error: 'parent_relation must be father or mother' },
            { status: 400 },
          );
        }
        fields.push(`${key} = $${idx}`);
        values.push(body[key]);
        idx += 1;
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(inquiryId);

    const result = await db.query(
      `UPDATE admission_inquiries SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (body.status && body.status !== oldStatus) {
      await logInquiryActivity(db, {
        inquiryId,
        activityType: 'status_change',
        description: `Status changed from ${oldStatus} to ${body.status}`,
        oldStatus,
        newStatus: body.status,
      });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating inquiry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update inquiry' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const inquiryId = parseId(params.id);
    if (!inquiryId) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const result = await db.query(
      'DELETE FROM admission_inquiries WHERE id = $1 RETURNING id',
      [inquiryId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Inquiry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Inquiry deleted' });
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete inquiry' },
      { status: 500 }
    );
  }
}
