import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';
import { actorName, parseOptionalNumber } from '@/lib/student-operations-utils';
import { nextRegistrationNumber } from '@/lib/student-registration-service';
import {
  REGISTRATION_WRITE_COLUMNS,
  registrationWriteValues,
} from '@/lib/registration-write-values';

const LIST_SQL = `
  SELECT r.*, c.name AS class_name
  FROM student_registrations r
  LEFT JOIN classes c ON r.class_id = c.id
`;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    const { db } = auth;
    await ensureStudentOperationsSchema(db);

    const search = request.nextUrl.searchParams.get('search')?.trim() || '';
    const status = request.nextUrl.searchParams.get('status')?.trim() || '';
    const classId = request.nextUrl.searchParams.get('class_id');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (search) {
      conditions.push(`(
        r.registration_number ILIKE $${i}
        OR r.student_first_name ILIKE $${i}
        OR r.student_last_name ILIKE $${i}
        OR r.parent_name ILIKE $${i}
        OR r.parent_phone ILIKE $${i}
        OR COALESCE(r.mother_name, '') ILIKE $${i}
        OR COALESCE(r.student_email, '') ILIKE $${i}
        OR COALESCE(r.aadhaar_no, '') ILIKE $${i}
      )`);
      params.push(`%${search}%`);
      i += 1;
    }
    if (status) {
      conditions.push(`r.status = $${i}`);
      params.push(status);
      i += 1;
    }
    if (classId) {
      conditions.push(`r.class_id = $${i}`);
      params.push(parseInt(classId, 10));
      i += 1;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query(
      `${LIST_SQL} ${where} ORDER BY r.registration_date DESC, r.id DESC`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing registrations:', error);
    return NextResponse.json({ success: false, error: 'Failed to load registrations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    const { db, user } = auth;
    await ensureStudentOperationsSchema(db);

    const body = await request.json();
    const values = registrationWriteValues(body);
    if (!values.student_first_name || !values.parent_name || !values.parent_phone) {
      return NextResponse.json(
        { success: false, error: 'Student name, father name, and father phone are required' },
        { status: 400 }
      );
    }

    if (!values.registration_date) {
      values.registration_date = new Date().toISOString().split('T')[0];
    }

    const registrationNumber = await nextRegistrationNumber(db);
    const columns = [
      'registration_number',
      'inquiry_id',
      ...REGISTRATION_WRITE_COLUMNS,
      'created_by',
      'created_by_name',
    ];
    const params: unknown[] = [
      registrationNumber,
      parseOptionalNumber(body.inquiry_id),
      ...REGISTRATION_WRITE_COLUMNS.map((key) => values[key]),
      user.id,
      actorName(user),
    ];
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(',');

    const result = await db.query(
      `INSERT INTO student_registrations (${columns.join(', ')})
       VALUES (${placeholders})
       RETURNING *`,
      params
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating registration:', error);
    return NextResponse.json({ success: false, error: 'Failed to create registration' }, { status: 500 });
  }
}
