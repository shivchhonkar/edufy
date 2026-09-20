import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { studentCountSearchSql, studentSearchSql } from '@/lib/student-search';
import type { RequestDb } from '@/lib/request-db';
import { Student } from '@/shared/types';
import { getPaginationParams } from '@/lib/utils';
import {
  generateAdmissionNumberForSchool,
  getAdmissionNumberSettings,
} from '@/lib/admission-number-settings';
import { ensureDefaultStudentGuardians, ensureStudentMotherColumns, syncStudentMedicalBloodGroup } from '@/lib/student-profile-api';
import { FeeGenerationService } from '@/lib/fees/FeeGenerationService';
import {
  JOIN_CURRENT_ENROLLMENT_ON_STUDENT,
  STUDENT_PLACEMENT_SELECT,
} from '@/lib/enrollment-sql';
import { createCurrentEnrollment, prepareEnrollmentSchema } from '@/lib/enrollment-service';
import { assertClassAgeRestriction } from '@/lib/class-age-restriction';

async function assignDefaultFeesToStudent(studentId: number, classId: number | null, db: RequestDb) {
  try {
    const settingsResult = await db.query('SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1');
    let academicYear = new Date().getFullYear().toString();

    if (settingsResult.rows.length > 0 && settingsResult.rows[0].academic_year) {
      academicYear = settingsResult.rows[0].academic_year;
    }

    console.log(`Auto assigning fees for new student ${studentId} in academic year ${academicYear}`);

    const result = await FeeGenerationService.generateStudentFees(db, {
      academicYear,
      studentId,
      forceReassign: false,
      conflictStrategy: 'ignore',
    });

    console.log(`✅ Assigned ${result.feesAssigned} fee records to student ${studentId}`);
    return { assigned: result.feesAssigned, total: result.feesAssigned + result.feesSkipped };
  } catch (error) {
    console.error('Error in assignDefaultFeesToStudent:', error);
    return { assigned: 0, total: 0 };
  }
}

// GET all students with pagination and search
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;
    await prepareEnrollmentSchema(db);
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '550');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'active';
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id');

    const { offset, limit: pageLimit } = getPaginationParams(page, limit);

    let queryText = `
      SELECT s.*,
        ${STUDENT_PLACEMENT_SELECT},
        c.name as class_name, sec.name as section_name
      FROM students s
      ${JOIN_CURRENT_ENROLLMENT_ON_STUDENT}
      LEFT JOIN classes c ON COALESCE(ce.class_id, s.class_id) = c.id
      LEFT JOIN sections sec ON COALESCE(ce.section_id, s.section_id) = sec.id
      WHERE s.status = $1
    `;
    let queryParams: any[] = [status];
    let paramCount = 1;

    if (search) {
      paramCount++;
      queryText += ` AND ${studentSearchSql(paramCount)}`;
      queryParams.push(`%${search}%`);
    }

    if (classId === 'unassigned') {
      queryText += ' AND COALESCE(ce.class_id, s.class_id) IS NULL';
    } else if (classId === 'assigned') {
      queryText += ' AND COALESCE(ce.class_id, s.class_id) IS NOT NULL';
    } else if (classId) {
      paramCount++;
      queryText += ` AND COALESCE(ce.class_id, s.class_id) = $${paramCount}`;
      queryParams.push(classId);
    }

    if (sectionId) {
      paramCount++;
      queryText += ` AND COALESCE(ce.section_id, s.section_id) = $${paramCount}`;
      queryParams.push(sectionId);
    }

    queryText += ` ORDER BY s.first_name ASC, s.last_name ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(pageLimit, offset);

    const result = await db.query<Student>(queryText, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM students WHERE status = $1';
    let countParams: any[] = [status];
    let countParamCount = 1;
    
    if (search) {
      countParamCount++;
      countQuery += ` AND ${studentCountSearchSql(countParamCount)}`;
      countParams.push(`%${search}%`);
    }

    if (classId === 'unassigned') {
      countQuery += ' AND class_id IS NULL';
    } else if (classId === 'assigned') {
      countQuery += ' AND class_id IS NOT NULL';
    } else if (classId) {
      countParamCount++;
      countQuery += ` AND class_id = $${countParamCount}`;
      countParams.push(classId);
    }

    if (sectionId) {
      countParamCount++;
      countQuery += ` AND section_id = $${countParamCount}`;
      countParams.push(sectionId);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit: pageLimit,
        total,
        totalPages: Math.ceil(total / pageLimit),
      },
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

// POST create new student
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;
    const body = await request.json();
    const {
      first_name,
      middle_name,
      last_name,
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
    } = body;

    // Validation
    if (!first_name || !last_name || !date_of_birth || !gender || !admission_date) {
      return NextResponse.json(
        { success: false, error: 'Required fields are missing' },
        { status: 400 }
      );
    }

    const ageCheck = await assertClassAgeRestriction(db, {
      classId: class_id,
      dateOfBirth: date_of_birth,
      admissionDate: admission_date,
    });
    if (!ageCheck.ok) {
      return NextResponse.json({ success: false, error: ageCheck.error }, { status: 400 });
    }

    // Generate admission number from school setup settings
    const admissionSettings = await getAdmissionNumberSettings(db);
    const admission_number = generateAdmissionNumberForSchool(admissionSettings);

    await ensureStudentMotherColumns(db);

    const result = await db.query<Student>(
      `INSERT INTO students (
        admission_number, student_code, first_name, middle_name, last_name,
        date_of_birth, gender, blood_group, aadhaar_no, religion, caste, category,
        nationality, mother_tongue, remarks, address, city, state, pincode,
        admission_date, parent_name, parent_phone, parent_email, mother_name, mother_phone, mother_email,
        emergency_contact, photo_url, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
      )
      RETURNING *`,
      [
        admission_number, student_code || null, first_name, middle_name || null, last_name,
        date_of_birth, gender, blood_group || null, aadhaar_no || null,
        religion || null, caste || null, category || null, nationality || null,
        mother_tongue || null, remarks || null, address || null, city || null,
        state || null, pincode || null, admission_date, parent_name || null,
        parent_phone || null, parent_email || null, mother_name || null,
        mother_phone || null, mother_email || null, emergency_contact || null,
        photo_url || null, 'active',
      ]
    );

    const newStudent = result.rows[0];

    if (class_id) {
      try {
        await createCurrentEnrollment(db, {
          studentId: newStudent.id,
          classId: class_id,
          sectionId: section_id || null,
          rollNumber: roll_number || null,
        });
      } catch (enrollmentError) {
        console.error('Error creating student enrollment:', enrollmentError);
      }
    }

    // Automatically assign fees for new student
    try {
      await assignDefaultFeesToStudent(newStudent.id, class_id, db);
    } catch (feeError) {
      console.error('Error assigning default fees to new student:', feeError);
      // Don't fail student creation if fee assignment fails
    }

    try {
      await ensureDefaultStudentGuardians(db, newStudent.id);
    } catch (guardianError) {
      console.error('Error syncing default guardians for new student:', guardianError);
    }

    if (blood_group) {
      try {
        await syncStudentMedicalBloodGroup(db, newStudent.id, blood_group);
      } catch (medicalError) {
        console.error('Error syncing medical blood group for new student:', medicalError);
      }
    }

    return NextResponse.json({
      success: true,
      data: newStudent,
      message: 'Student created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create student' },
      { status: 500 }
    );
  }
}

