import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { inquiryExists, logInquiryActivity } from '@/lib/admission-inquiry-api';

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const VALID_TYPES = ['note', 'call', 'email', 'visit', 'sms'] as const;

export async function GET(
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
      `SELECT * FROM admission_inquiry_activities
       WHERE inquiry_id = $1 ORDER BY created_at DESC`,
      [inquiryId]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const inquiryId = parseId(params.id);
    if (!inquiryId) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    if (!(await inquiryExists(db, inquiryId))) {
      return NextResponse.json({ success: false, error: 'Inquiry not found' }, { status: 404 });
    }

    const body = await request.json();
    const { activity_type = 'note', description } = body;

    if (!description?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(activity_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid activity type' },
        { status: 400 }
      );
    }

    await logInquiryActivity(db, {
      inquiryId,
      activityType: activity_type,
      description: description.trim(),
    });

    await db.query(
      'UPDATE admission_inquiries SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [inquiryId]
    );

    const activities = await db.query(
      `SELECT * FROM admission_inquiry_activities
       WHERE inquiry_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [inquiryId]
    );

    return NextResponse.json(
      { success: true, data: activities.rows[0], message: 'Activity logged' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}
