import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import {
  parseStudentId,
  ensureDefaultStudentGuardians,
  ensureStudentMotherColumns,
  syncCurrentEnrollmentFromStudent,
  syncStudentMedicalBloodGroup,
} from '@/lib/student-profile-api';
import { Student } from '@/shared/types';
import {
  JOIN_CURRENT_ENROLLMENT_ON_STUDENT,
  STUDENT_PLACEMENT_SELECT,
} from '@/lib/enrollment-sql';
import { prepareEnrollmentSchema } from '@/lib/enrollment-service';
import { assertClassAgeRestriction } from '@/lib/class-age-restriction';

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

    await prepareEnrollmentSchema(db);

    const result = await db.query<Student>(
      `SELECT s.*,
        ${STUDENT_PLACEMENT_SELECT},
        c.name as class_name, sec.name as section_name
       FROM students s
       ${JOIN_CURRENT_ENROLLMENT_ON_STUDENT}
       LEFT JOIN classes c ON COALESCE(ce.class_id, s.class_id) = c.id
       LEFT JOIN sections sec ON COALESCE(ce.section_id, s.section_id) = sec.id
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
      mother_name,
      mother_phone,
      mother_email,
      emergency_contact,
      photo_url,
      status,
    } = body;

    await ensureStudentMotherColumns(db);
    await prepareEnrollmentSchema(db);

    const current = await db.query<{
      date_of_birth: string | Date | null;
      admission_date: string | Date | null;
      class_id: number | null;
    }>(
      `SELECT s.date_of_birth, s.admission_date, COALESCE(ce.class_id, s.class_id) AS class_id
       FROM students s
       ${JOIN_CURRENT_ENROLLMENT_ON_STUDENT}
       WHERE s.id = $1`,
      [studentId],
    );
    const ageCheck = await assertClassAgeRestriction(db, {
      classId: class_id ?? current.rows[0]?.class_id,
      dateOfBirth: date_of_birth || current.rows[0]?.date_of_birth?.toString().slice(0, 10),
      admissionDate: admission_date || current.rows[0]?.admission_date?.toString().slice(0, 10),
    });
    if (!ageCheck.ok) {
      return NextResponse.json({ success: false, error: ageCheck.error }, { status: 400 });
    }

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
        parent_name = COALESCE($20, parent_name),
        parent_phone = COALESCE($21, parent_phone),
        parent_email = COALESCE($22, parent_email),
        mother_name = COALESCE($23, mother_name),
        mother_phone = COALESCE($24, mother_phone),
        mother_email = COALESCE($25, mother_email),
        emergency_contact = COALESCE($26, emergency_contact),
        photo_url = COALESCE($27, photo_url),
        status = COALESCE($28, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $29
      RETURNING *`,
      [
        first_name, last_name, middle_name, student_code, date_of_birth, gender, blood_group,
        aadhaar_no, religion, caste, category, nationality, mother_tongue, remarks,
        address, city, state, pincode, admission_date,
        parent_name, parent_phone, parent_email, mother_name, mother_phone, mother_email,
        emergency_contact, photo_url, status, studentId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    try {
      await ensureDefaultStudentGuardians(db, studentId);
    } catch (guardianError) {
      console.error('Error syncing default guardians after student update:', guardianError);
    }

    try {
      await syncCurrentEnrollmentFromStudent(db, studentId, class_id, section_id, roll_number);
    } catch (enrollmentError) {
      console.error('Error syncing current enrollment after student update:', enrollmentError);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'blood_group')) {
      try {
        await syncStudentMedicalBloodGroup(db, studentId, blood_group);
      } catch (medicalError) {
        console.error('Error syncing medical blood group after student update:', medicalError);
      }
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
