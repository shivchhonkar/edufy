import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { parseStudentId } from '@/lib/student-profile-api';
import { Student } from '@/shared/types';

// GET single student
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

    const result = await db.query<Student>(
      `SELECT s.*, c.name as class_name, sec.name as section_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       WHERE s.id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student' },
      { status: 500 }
    );
  }
}

// PUT update student
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const studentId = parseStudentId(params.id);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }

    const body = await request.json();
    const {
      first_name,
      last_name,
      middle_name,
      student_code,
      date_of_birth,
      gender,
      blood_group,
      aadhaar_no,
      religion,
      caste,
      category,
      nationality,
      mother_tongue,
      remarks,
      address,
      city,
      state,
      pincode,
      admission_date,
      class_id,
      section_id,
      roll_number,
      parent_name,
      parent_phone,
      parent_email,
      emergency_contact,
      photo_url,
      status,
    } = body;

    const result = await db.query<Student>(
      `UPDATE students SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        middle_name = COALESCE($3, middle_name),
        student_code = COALESCE($4, student_code),
        date_of_birth = COALESCE($5, date_of_birth),
        gender = COALESCE($6, gender),
        blood_group = COALESCE($7, blood_group),
        aadhaar_no = COALESCE($8, aadhaar_no),
        religion = COALESCE($9, religion),
        caste = COALESCE($10, caste),
        category = COALESCE($11, category),
        nationality = COALESCE($12, nationality),
        mother_tongue = COALESCE($13, mother_tongue),
        remarks = COALESCE($14, remarks),
        address = COALESCE($15, address),
        city = COALESCE($16, city),
        state = COALESCE($17, state),
        pincode = COALESCE($18, pincode),
        admission_date = COALESCE($19, admission_date),
        class_id = COALESCE($20, class_id),
        section_id = COALESCE($21, section_id),
        roll_number = COALESCE($22, roll_number),
        parent_name = COALESCE($23, parent_name),
        parent_phone = COALESCE($24, parent_phone),
        parent_email = COALESCE($25, parent_email),
        emergency_contact = COALESCE($26, emergency_contact),
        photo_url = COALESCE($27, photo_url),
        status = COALESCE($28, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $29
      RETURNING *`,
      [
        first_name, last_name, middle_name, student_code, date_of_birth, gender, blood_group,
        aadhaar_no, religion, caste, category, nationality, mother_tongue, remarks,
        address, city, state, pincode, admission_date, class_id, section_id, roll_number,
        parent_name, parent_phone, parent_email, emergency_contact, photo_url,
        status, studentId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Student updated successfully',
    });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update student' },
      { status: 500 }
    );
  }
}

// DELETE student
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const studentId = parseStudentId(params.id);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }

    const result = await db.query(
      'DELETE FROM students WHERE id = $1 RETURNING id',
      [studentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete student' },
      { status: 500 }
    );
  }
}
