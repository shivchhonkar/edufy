import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureAdmissionInquirySchema } from '@/lib/ensure-admission-inquiry-schema';
import {
  generateInquiryNumber,
  INQUIRY_FROM_JOIN,
  INQUIRY_SELECT,
  isValidInquirySource,
  isValidInquiryStatus,
  isValidParentRelation,
  logInquiryActivity,
  nextEnquirySerial,
} from '@/lib/admission-inquiry-api';
import { inquiryWriteValues, isValidStudentType } from '@/lib/inquiry-write-values';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureAdmissionInquirySchema(db);
    const status = request.nextUrl.searchParams.get('status');
    const search = request.nextUrl.searchParams.get('search') || '';
    const priority = request.nextUrl.searchParams.get('priority');
    const source = request.nextUrl.searchParams.get('source');

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

    if (source && isValidInquirySource(source)) {
      paramCount += 1;
      queryText += ` AND i.source = $${paramCount}`;
      params.push(source);
    }

    if (search) {
      paramCount += 1;
      queryText += ` AND (
        i.inquiry_number ILIKE $${paramCount}
        OR i.student_first_name ILIKE $${paramCount}
        OR i.student_last_name ILIKE $${paramCount}
        OR i.parent_name ILIKE $${paramCount}
        OR i.parent_phone ILIKE $${paramCount}
        OR COALESCE(i.mother_name, '') ILIKE $${paramCount}
        OR COALESCE(i.mother_phone, '') ILIKE $${paramCount}
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
    await ensureAdmissionInquirySchema(db);
    const body = await request.json();
    const values = inquiryWriteValues(body);
    const status = body.status;

    if (!values.student_first_name || !values.parent_name || !values.parent_phone) {
      return NextResponse.json(
        { success: false, error: 'Student name, father name, and father phone are required' },
        { status: 400 }
      );
    }

    if (values.source && !isValidInquirySource(values.source)) {
      return NextResponse.json({ success: false, error: 'Invalid source' }, { status: 400 });
    }

    if (values.parent_relation && !isValidParentRelation(values.parent_relation)) {
      return NextResponse.json(
        { success: false, error: 'parent_relation must be father or mother' },
        { status: 400 },
      );
    }

    if (values.student_type && !isValidStudentType(values.student_type)) {
      return NextResponse.json({ success: false, error: 'Invalid student type' }, { status: 400 });
    }

    const initialStatus = status && isValidInquiryStatus(status) ? status : 'new';

    const inquiryNumber = generateInquiryNumber();
    const enquirySerial = await nextEnquirySerial(db, values.academic_year);

    const result = await db.query(
      `INSERT INTO admission_inquiries (
        inquiry_number, enquiry_serial, inquiry_date, student_first_name, student_last_name,
        student_title, date_of_birth, gender, student_email, last_school,
        parent_relation, parent_name, parent_phone, parent_email,
        father_qualification, father_occupation, father_office_address,
        mother_name, mother_phone, mother_email, mother_qualification, mother_occupation, mother_office_address,
        address, city, state, pincode, location, reporting, reporting_mobile,
        interested_class_id, academic_year, number_of_students, is_cancelled, student_type,
        source, status, priority, follow_up_date, remarks, additional_students, siblings
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42
      )
      RETURNING *`,
      [
        inquiryNumber,
        enquirySerial,
        values.inquiry_date,
        values.student_first_name,
        values.student_last_name,
        values.student_title,
        values.date_of_birth,
        values.gender,
        values.student_email,
        values.last_school,
        values.parent_relation,
        values.parent_name,
        values.parent_phone,
        values.parent_email,
        values.father_qualification,
        values.father_occupation,
        values.father_office_address,
        values.mother_name,
        values.mother_phone,
        values.mother_email,
        values.mother_qualification,
        values.mother_occupation,
        values.mother_office_address,
        values.address,
        values.city,
        values.state,
        values.pincode,
        values.location,
        values.reporting,
        values.reporting_mobile,
        values.interested_class_id,
        values.academic_year,
        values.number_of_students,
        values.is_cancelled,
        values.student_type,
        values.source,
        initialStatus,
        values.priority,
        values.follow_up_date,
        values.remarks,
        values.additional_students,
        values.siblings,
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
