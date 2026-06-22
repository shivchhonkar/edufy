import type { RequestDb } from '@/lib/request-db';
import { logInquiryActivity } from '@/lib/admission-inquiry-api';
import { ensureStudentMotherColumns } from '@/lib/student-profile-api';
import { generateAdmissionNumber } from '@/lib/utils';

interface InquiryRow {
  id: number;
  status: string;
  converted_student_id: number | null;
  student_first_name: string;
  student_last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  parent_relation: 'father' | 'mother' | null;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  interested_class_id: number | null;
  remarks: string | null;
}

export class InquiryConvertError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'InquiryConvertError';
  }
}

const MAX_ADMISSION_NUMBER_ATTEMPTS = 8;

function isDuplicateAdmissionNumberError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === '23505'
  );
}

export async function convertInquiryToStudent(
  db: RequestDb,
  inquiryId: number,
  options: {
    class_id?: number | null;
    section_id?: number | null;
    admission_date?: string;
  } = {}
): Promise<{ student: Record<string, unknown>; inquiry: InquiryRow }> {
  const inquiryResult = await db.query<InquiryRow>(
    'SELECT * FROM admission_inquiries WHERE id = $1',
    [inquiryId]
  );

  if (inquiryResult.rows.length === 0) {
    throw new InquiryConvertError('Inquiry not found', 404);
  }

  const inquiry = inquiryResult.rows[0];

  if (inquiry.converted_student_id) {
    throw new InquiryConvertError('Inquiry already converted', 400, {
      student_id: inquiry.converted_student_id,
    });
  }

  if (!inquiry.date_of_birth) {
    throw new InquiryConvertError(
      'Add date of birth on the inquiry before converting to a student',
      400
    );
  }

  // Always use class saved on the inquiry in DB (avoids stale UI state during convert)
  const classId = inquiry.interested_class_id ?? options.class_id ?? null;
  const sectionId = options.section_id ?? null;

  if (!classId) {
    throw new InquiryConvertError(
      'Select a class on the inquiry before converting to a student',
      400
    );
  }

  const classCheck = await db.query<{ id: number; name: string }>(
    'SELECT id, name FROM classes WHERE id = $1',
    [classId]
  );
  if (classCheck.rows.length === 0) {
    throw new InquiryConvertError('Selected class no longer exists', 400);
  }
  const admissionDate =
    options.admission_date || new Date().toISOString().split('T')[0];

  const lastName = inquiry.student_last_name?.trim() || '—';
  const gender = inquiry.gender || 'Male';
  const isMother = inquiry.parent_relation === 'mother';

  await ensureStudentMotherColumns(db);

  let student: Record<string, unknown> | undefined;
  let admission_number = '';

  for (let attempt = 0; attempt < MAX_ADMISSION_NUMBER_ATTEMPTS; attempt++) {
    admission_number = generateAdmissionNumber();
    try {
      const studentResult = await db.query(
        `INSERT INTO students (
          admission_number, first_name, last_name, date_of_birth, gender,
          address, city, state, pincode, admission_date, class_id, section_id,
          parent_name, parent_phone, parent_email,
          mother_name, mother_phone, mother_email,
          remarks, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
        RETURNING *`,
        [
          admission_number,
          inquiry.student_first_name,
          lastName,
          inquiry.date_of_birth,
          gender,
          inquiry.address,
          inquiry.city,
          inquiry.state,
          inquiry.pincode,
          admissionDate,
          classId,
          sectionId,
          isMother ? null : inquiry.parent_name,
          isMother ? null : inquiry.parent_phone,
          isMother ? null : inquiry.parent_email,
          isMother ? inquiry.parent_name : null,
          isMother ? inquiry.parent_phone : null,
          isMother ? inquiry.parent_email : null,
          inquiry.remarks,
          'active',
        ]
      );
      student = studentResult.rows[0] as Record<string, unknown>;
      break;
    } catch (error) {
      if (isDuplicateAdmissionNumberError(error) && attempt < MAX_ADMISSION_NUMBER_ATTEMPTS - 1) {
        continue;
      }
      if (isDuplicateAdmissionNumberError(error)) {
        throw new InquiryConvertError(
          'Could not generate a unique admission number. Please try again.',
          409
        );
      }
      throw error;
    }
  }

  if (!student) {
    throw new InquiryConvertError('Failed to create student record', 500);
  }

  if (classId) {
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
          status, is_current
        ) VALUES ($1, $2, $3, $4, $5, 'active', true)`,
        [student.id, academicYearId, academicYear, classId, sectionId]
      );
    } catch (enrollmentError) {
      console.error('Error creating enrollment from inquiry:', enrollmentError);
    }
  }

  const oldStatus = inquiry.status;

  const updatedInquiry = await db.query<InquiryRow>(
    `UPDATE admission_inquiries
     SET status = 'enrolled', converted_student_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [student.id, inquiryId]
  );

  await logInquiryActivity(db, {
    inquiryId,
    activityType: 'status_change',
    description: `Converted to student ${admission_number}`,
    oldStatus,
    newStatus: 'enrolled',
  });

  return { student, inquiry: updatedInquiry.rows[0] };
}
