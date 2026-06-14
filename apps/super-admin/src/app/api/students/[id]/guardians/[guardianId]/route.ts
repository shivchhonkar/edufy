import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import {
  clearPrimaryGuardian,
  isValidGuardianRelation,
  parseStudentId,
  studentExists,
} from '@/lib/student-profile-api';
import type { StudentGuardian } from '@/shared/types';

async function getGuardianForStudent(
  db: Awaited<ReturnType<typeof getRequestDb>>['db'],
  studentId: number,
  guardianId: number
) {
  const result = await db.query<StudentGuardian>(
    'SELECT * FROM student_guardians WHERE id = $1 AND student_id = $2',
    [guardianId, studentId]
  );
  return result.rows[0] ?? null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; guardianId: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const studentId = parseStudentId(params.id);
    const guardianId = parseStudentId(params.guardianId);

    if (!studentId || !guardianId) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    if (!(await studentExists(db, studentId))) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const existing = await getGuardianForStudent(db, studentId, guardianId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Guardian not found' }, { status: 404 });
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

    if (relation_type && !isValidGuardianRelation(relation_type)) {
      return NextResponse.json(
        { success: false, error: 'relation_type must be father, mother, or guardian' },
        { status: 400 }
      );
    }

    if (name !== undefined && !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'name cannot be empty' }, { status: 400 });
    }

    if (is_primary_contact) {
      await clearPrimaryGuardian(db, studentId);
    }

    const result = await db.query<StudentGuardian>(
      `UPDATE student_guardians SET
        relation_type = COALESCE($1, relation_type),
        name = COALESCE($2, name),
        mobile = COALESCE($3, mobile),
        alternate_mobile = COALESCE($4, alternate_mobile),
        email = COALESCE($5, email),
        occupation = COALESCE($6, occupation),
        annual_income = COALESCE($7, annual_income),
        company_name = COALESCE($8, company_name),
        aadhaar_no = COALESCE($9, aadhaar_no),
        photo = COALESCE($10, photo),
        is_primary_contact = COALESCE($11, is_primary_contact),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12 AND student_id = $13
      RETURNING *`,
      [
        relation_type ?? null,
        name?.trim() ?? null,
        mobile ?? null,
        alternate_mobile ?? null,
        email ?? null,
        occupation ?? null,
        annual_income ?? null,
        company_name ?? null,
        aadhaar_no ?? null,
        photo ?? null,
        is_primary_contact ?? null,
        guardianId,
        studentId,
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Guardian updated successfully',
    });
  } catch (error) {
    console.error('Error updating student guardian:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update guardian' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; guardianId: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const studentId = parseStudentId(params.id);
    const guardianId = parseStudentId(params.guardianId);

    if (!studentId || !guardianId) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const result = await db.query(
      'DELETE FROM student_guardians WHERE id = $1 AND student_id = $2 RETURNING id',
      [guardianId, studentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Guardian not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Guardian deleted successfully' });
  } catch (error) {
    console.error('Error deleting student guardian:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete guardian' },
      { status: 500 }
    );
  }
}
