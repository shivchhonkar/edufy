import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import {
  clearPrimaryGuardian,
  isValidGuardianRelation,
  parseStudentId,
  studentExists,
} from '@/lib/student-profile-api';
import type { StudentGuardian } from '@/shared/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const result = await db.query<StudentGuardian>(
      `SELECT * FROM student_guardians
       WHERE student_id = $1
       ORDER BY
         CASE relation_type WHEN 'father' THEN 1 WHEN 'mother' THEN 2 ELSE 3 END,
         is_primary_contact DESC,
         id ASC`,
      [studentId]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching student guardians:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch guardians' },
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
    const studentId = parseStudentId(params.id);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }

    if (!(await studentExists(db, studentId))) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      relation_type,
      name,
      mobile,
      alternate_mobile,
      email,
      occupation,
      annual_income,
      company_name,
      aadhaar_no,
      photo,
      is_primary_contact,
    } = body;

    if (!relation_type || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'relation_type and name are required' },
        { status: 400 }
      );
    }

    if (!isValidGuardianRelation(relation_type)) {
      return NextResponse.json(
        { success: false, error: 'relation_type must be father, mother, or guardian' },
        { status: 400 }
      );
    }

    if (is_primary_contact) {
      await clearPrimaryGuardian(db, studentId);
    }

    const result = await db.query<StudentGuardian>(
      `INSERT INTO student_guardians (
        student_id, relation_type, name, mobile, alternate_mobile, email,
        occupation, annual_income, company_name, aadhaar_no, photo, is_primary_contact
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        studentId,
        relation_type,
        name.trim(),
        mobile || null,
        alternate_mobile || null,
        email || null,
        occupation || null,
        annual_income ?? null,
        company_name || null,
        aadhaar_no || null,
        photo || null,
        Boolean(is_primary_contact),
      ]
    );

    return NextResponse.json(
      { success: true, data: result.rows[0], message: 'Guardian added successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating student guardian:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create guardian' },
      { status: 500 }
    );
  }
}
