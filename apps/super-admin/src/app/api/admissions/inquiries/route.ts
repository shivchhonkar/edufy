import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import {
  generateInquiryNumber,
  INQUIRY_FROM_JOIN,
  INQUIRY_SELECT,
  isValidInquirySource,
  isValidInquiryStatus,
  logInquiryActivity,
} from '@/lib/admission-inquiry-api';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const status = request.nextUrl.searchParams.get('status');
    const search = request.nextUrl.searchParams.get('search') || '';
    const priority = request.nextUrl.searchParams.get('priority');

    let queryText = `
      SELECT ${INQUIRY_SELECT}
      ${INQUIRY_FROM_JOIN}
      WHERE 1=1`;
    const params: (string | number)[] = [];
    let paramCount = 0;

    if (status && isValidInquiryStatus(status)) {
      paramCount += 1;
      queryText += ` AND i.status = $${paramCount}`;
      params.push(status);
    }

    if (priority) {
      paramCount += 1;
      queryText += ` AND i.priority = $${paramCount}`;
      params.push(priority);
    }

    if (search) {
      paramCount += 1;
      queryText += ` AND (
        i.inquiry_number ILIKE $${paramCount}
        OR i.student_first_name ILIKE $${paramCount}
        OR i.student_last_name ILIKE $${paramCount}
        OR i.parent_name ILIKE $${paramCount}
        OR i.parent_phone ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    queryText += ` ORDER BY
      CASE i.priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
      i.follow_up_date ASC NULLS LAST,
      i.created_at DESC`;

    const result = await db.query(queryText, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inquiries. Run phase8 migration.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();

    const {
      student_first_name,
      student_last_name,
      date_of_birth,
      gender,
      parent_name,
      parent_phone,
      parent_email,
      address,
      city,
      state,
      pincode,
      interested_class_id,
      academic_year,
      source = 'walk_in',
      priority = 'normal',
      follow_up_date,
      remarks,
      status = 'new',
    } = body;

    if (!student_first_name?.trim() || !parent_name?.trim() || !parent_phone?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Student first name, parent name, and phone are required' },
        { status: 400 }
      );
    }

    if (source && !isValidInquirySource(source)) {
      return NextResponse.json({ success: false, error: 'Invalid source' }, { status: 400 });
    }

    const initialStatus = status && isValidInquiryStatus(status) ? status : 'new';

    const inquiryNumber = generateInquiryNumber();

    const result = await db.query(
      `INSERT INTO admission_inquiries (
        inquiry_number, student_first_name, student_last_name, date_of_birth, gender,
        parent_name, parent_phone, parent_email, address, city, state, pincode,
        interested_class_id, academic_year, source, status, priority, follow_up_date, remarks
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *`,
      [
        inquiryNumber,
        student_first_name.trim(),
        student_last_name?.trim() || null,
        date_of_birth || null,
        gender || null,
        parent_name.trim(),
        parent_phone.trim(),
        parent_email?.trim() || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        interested_class_id || null,
        academic_year || null,
        source,
        initialStatus,
        priority,
        follow_up_date || null,
        remarks || null,
      ]
    );

    const inquiry = result.rows[0];

    await logInquiryActivity(db, {
      inquiryId: inquiry.id,
      activityType: 'note',
      description: 'Inquiry created',
      newStatus: initialStatus,
    });

    return NextResponse.json(
      { success: true, data: inquiry, message: 'Inquiry created' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating inquiry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create inquiry' },
      { status: 500 }
    );
  }
}
