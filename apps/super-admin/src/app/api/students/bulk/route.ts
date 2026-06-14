import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';

interface BulkStudentUpdate {
  id: number;
  student_code?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  aadhaar_no?: string;
  religion?: string;
  caste?: string;
  category?: string;
  nationality?: string;
  mother_tongue?: string;
  remarks?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  admission_date?: string;
  class_name?: string;
  section_name?: string;
  roll_number?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  emergency_contact?: string;
  status?: string;
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    const body = await request.json();
    const students: BulkStudentUpdate[] = body.students;

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { success: false, error: 'students array is required' },
        { status: 400 }
      );
    }

    if (students.length > 10000) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10,000 students per bulk update' },
        { status: 400 }
      );
    }

    const classResult = await db.query<{ id: number; name: string }>('SELECT id, name FROM classes');
    const sectionResult = await db.query<{ id: number; class_id: number; name: string }>(
      'SELECT id, class_id, name FROM sections'
    );

    const classMap = new Map(classResult.rows.map((c) => [c.name.toLowerCase(), c.id]));
    const sectionMap = new Map(
      sectionResult.rows.map((s) => [`${s.class_id}:${s.name.toLowerCase()}`, s.id])
    );

    let updated = 0;
    const errors: string[] = [];

    for (const student of students) {
      if (!student.id) {
        errors.push('Skipped row with missing id');
        continue;
      }

      try {
        let classId: number | null = null;
        let sectionId: number | null = null;

        const className = (student.class_name ?? '').trim();
        if (className) {
          classId = classMap.get(className.toLowerCase()) ?? null;
          if (!classId) {
            errors.push(`Student #${student.id}: class "${student.class_name}" not found`);
            continue;
          }
        }

        const sectionName = (student.section_name ?? '').trim();
        if (sectionName) {
          if (!classId) {
            errors.push(`Student #${student.id}: assign a class before section "${student.section_name}"`);
            continue;
          }
          sectionId = sectionMap.get(`${classId}:${sectionName.toLowerCase()}`) ?? null;
          if (!sectionId) {
            errors.push(`Student #${student.id}: section "${student.section_name}" not found for class`);
            continue;
          }
        }

        if (!student.first_name?.trim() || !student.last_name?.trim()) {
          errors.push(`Student #${student.id}: first name and last name are required`);
          continue;
        }

        if (!student.date_of_birth || !student.gender) {
          errors.push(`Student #${student.id}: date of birth and gender are required`);
          continue;
        }

        const result = await db.query(
          `UPDATE students SET
            student_code = $1,
            first_name = $2,
            middle_name = $3,
            last_name = $4,
            date_of_birth = $5,
            gender = $6,
            blood_group = $7,
            aadhaar_no = $8,
            religion = $9,
            caste = $10,
            category = $11,
            nationality = $12,
            mother_tongue = $13,
            remarks = $14,
            address = $15,
            city = $16,
            state = $17,
            pincode = $18,
            admission_date = $19,
            class_id = $20,
            section_id = $21,
            roll_number = $22,
            parent_name = $23,
            parent_phone = $24,
            parent_email = $25,
            emergency_contact = $26,
            status = $27,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $28
          RETURNING id`,
          [
            emptyToNull(student.student_code),
            student.first_name?.trim() || null,
            emptyToNull(student.middle_name),
            student.last_name?.trim() || null,
            student.date_of_birth || null,
            student.gender || null,
            emptyToNull(student.blood_group),
            emptyToNull(student.aadhaar_no),
            emptyToNull(student.religion),
            emptyToNull(student.caste),
            emptyToNull(student.category),
            emptyToNull(student.nationality),
            emptyToNull(student.mother_tongue),
            emptyToNull(student.remarks),
            emptyToNull(student.address),
            emptyToNull(student.city),
            emptyToNull(student.state),
            emptyToNull(student.pincode),
            student.admission_date || null,
            classId,
            sectionId,
            emptyToNull(student.roll_number),
            emptyToNull(student.parent_name),
            emptyToNull(student.parent_phone),
            emptyToNull(student.parent_email),
            emptyToNull(student.emergency_contact),
            student.status || null,
            student.id,
          ]
        );

        if (result.rows.length === 0) {
          errors.push(`Student #${student.id}: not found`);
          continue;
        }

        updated += 1;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Student #${student.id}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: { updated, failed: errors.length, errors },
      message: `Updated ${updated} student(s)`,
    });
  } catch (error) {
    console.error('Bulk student update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk update students' },
      { status: 500 }
    );
  }
}
