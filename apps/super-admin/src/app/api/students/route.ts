import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import type { RequestDb } from '@/lib/request-db';
import { Student } from '@/shared/types';
import { generateAdmissionNumber, getPaginationParams } from '@/lib/utils';
import { ensureDefaultStudentGuardians, ensureStudentMotherColumns } from '@/lib/student-profile-api';

// Helper function to assign default fees to a student (uses request-scoped db for multi-tenant)
async function assignDefaultFeesToStudent(studentId: number, classId: number | null, db: RequestDb) {
  try {
    const settingsResult = await db.query('SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1');
    let academicYear = new Date().getFullYear().toString();
    
    if (settingsResult.rows.length > 0 && settingsResult.rows[0].academic_year) {
      academicYear = settingsResult.rows[0].academic_year;
    }

    console.log(`Auto assigning fees for new student ${studentId} in academic year ${academicYear}`);
    
    // Get fee structures for the student's class
    const feeStructuresResult = await db.query(
      `SELECT * FROM fee_structures 
       WHERE (class_id = $1 OR class_id IS NULL)
       AND is_active = true
       AND (academic_year = $2 OR academic_year = $3 OR academic_year = $4)`,
      [classId, academicYear, academicYear.replace('-', '-'), academicYear.split('-')[0]]
    );

    if (feeStructuresResult.rows.length === 0) {
      console.log(`No active fee structures found for class ${classId} in academic year ${academicYear}`);
      return { assigned: 0, total: 0 };
    }

    let feesAssigned = 0;
    const currentDate = new Date();
    
    // Determine academic year start based on current academic year
    let academicYearStart: Date;
    if (currentDate.getMonth() >= 3) { // April or later
      academicYearStart = new Date(currentDate.getFullYear(), 3, 1); // April 1st current year
    } else { // January-March
      academicYearStart = new Date(currentDate.getFullYear() - 1, 3, 1); // April 1st previous year
    }

    for (const feeStructure of feeStructuresResult.rows) {
      // Calculate fee amount based on frequency
      let feeAmount = parseFloat(feeStructure.amount);
      let monthsToGenerate = 12;

      switch (feeStructure.frequency) {
        case 'monthly':
          monthsToGenerate = 12;
          break;
        case 'quarterly':
          monthsToGenerate = 4;
          feeAmount = feeAmount / 4;
          break;
        case 'half_yearly':
          monthsToGenerate = 2;
          feeAmount = feeAmount / 2;
          break;
        case 'yearly':
        case 'one_time':
          monthsToGenerate = 1;
          break;
      }

      // Generate fee records for the academic year
      for (let i = 0; i < monthsToGenerate; i++) {
        const dueDate = new Date(academicYearStart);
        dueDate.setMonth(academicYearStart.getMonth() + i);
        dueDate.setDate(10);

        if (feeStructure.frequency === 'one_time' && i > 0) continue;

        // For monthly fees, include ALL months from April onwards (don't skip past months)
        // This ensures overdue calculation works correctly

        try {
          await db.query(
            `INSERT INTO student_fees (
              student_id, fee_structure_id, academic_year, amount_due,
              due_date, month, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (student_id, fee_structure_id, academic_year, month) 
            DO NOTHING`,
            [
              studentId,
              feeStructure.id,
              academicYear,
              feeAmount,
              dueDate.toISOString().split('T')[0],
              i + 1,
              'pending'
            ]
          );
          feesAssigned++;
        } catch (error) {
          console.error(`Error assigning fee ${feeStructure.fee_type} to student ${studentId}:`, error);
        }
      }
    }

    console.log(`✅ Assigned ${feesAssigned} fee records to student ${studentId}`);
    return { assigned: feesAssigned, total: feeStructuresResult.rows.length };
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
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '550');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'active';
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id');

    const { offset, limit: pageLimit } = getPaginationParams(page, limit);

    let queryText = `
      SELECT s.*, c.name as class_name, sec.name as section_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE s.status = $1
    `;
    let queryParams: any[] = [status];
    let paramCount = 1;

    if (search) {
      paramCount++;
      queryText += ` AND (s.first_name ILIKE $${paramCount} OR s.last_name ILIKE $${paramCount} OR s.admission_number ILIKE $${paramCount} OR s.parent_phone ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (classId === 'unassigned') {
      queryText += ' AND s.class_id IS NULL';
    } else if (classId === 'assigned') {
      queryText += ' AND s.class_id IS NOT NULL';
    } else if (classId) {
      paramCount++;
      queryText += ` AND s.class_id = $${paramCount}`;
      queryParams.push(classId);
    }

    if (sectionId) {
      paramCount++;
      queryText += ` AND s.section_id = $${paramCount}`;
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
      countQuery += ` AND (first_name ILIKE $${countParamCount} OR last_name ILIKE $${countParamCount} OR admission_number ILIKE $${countParamCount} OR parent_phone ILIKE $${countParamCount})`;
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

    // Generate admission number
    const admission_number = generateAdmissionNumber();

    await ensureStudentMotherColumns(db);

    const result = await db.query<Student>(
      `INSERT INTO students (
        admission_number, student_code, first_name, middle_name, last_name,
        date_of_birth, gender, blood_group, aadhaar_no, religion, caste, category,
        nationality, mother_tongue, remarks, address, city, state, pincode,
        admission_date, class_id, section_id, roll_number,
        parent_name, parent_phone, parent_email, mother_name, mother_phone, mother_email,
        emergency_contact, photo_url, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
      )
      RETURNING *`,
      [
        admission_number, student_code || null, first_name, middle_name || null, last_name,
        date_of_birth, gender, blood_group || null, aadhaar_no || null,
        religion || null, caste || null, category || null, nationality || null,
        mother_tongue || null, remarks || null, address || null, city || null,
        state || null, pincode || null, admission_date, class_id || null,
        section_id || null, roll_number || null, parent_name || null,
        parent_phone || null, parent_email || null, mother_name || null,
        mother_phone || null, mother_email || null, emergency_contact || null,
        photo_url || null, 'active',
      ]
    );

    const newStudent = result.rows[0];

    if (class_id) {
      try {
        const ayResult = await db.query<{ id: number; name: string }>(
          'SELECT id, name FROM academic_years WHERE is_active = true LIMIT 1'
        );
        const academicYear =
          ayResult.rows[0]?.name ||
          `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        const academicYearId = ayResult.rows[0]?.id ?? null;

        await db.query(
          `INSERT INTO student_enrollments (
            student_id, academic_year_id, academic_year, class_id, section_id,
            roll_number, status, is_current
          ) VALUES ($1, $2, $3, $4, $5, $6, 'active', true)`,
          [
            newStudent.id,
            academicYearId,
            academicYear,
            class_id,
            section_id || null,
            roll_number || null,
          ]
        );
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

