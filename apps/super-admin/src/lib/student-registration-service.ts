import type { RequestDb } from '@/lib/request-db';
import { ensureStudentMotherColumns } from '@/lib/student-profile-api';
import { createCurrentEnrollment } from '@/lib/enrollment-service';
import {
  generateAdmissionNumberForSchool,
  getAdmissionNumberSettings,
} from '@/lib/admission-number-settings';
import { assertClassAgeRestriction } from '@/lib/class-age-restriction';
import { generatePrefixedNumber } from '@/lib/student-operations-utils';

export interface RegistrationRow {
  id: number;
  registration_number: string;
  student_first_name: string;
  student_last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  mother_name?: string | null;
  mother_phone?: string | null;
  mother_email?: string | null;
  class_id: number | null;
  status: string;
  converted_student_id: number | null;
  remarks: string | null;
  aadhaar_no?: string | null;
  religion?: string | null;
  caste?: string | null;
  social_category?: string | null;
  category?: string | null;
  nationality?: string | null;
  blood_group?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

export class RegistrationAdmitError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'RegistrationAdmitError';
  }
}

export async function nextRegistrationNumber(db: RequestDb): Promise<string> {
  return generatePrefixedNumber(db, 'student_registrations', 'registration_number', 'REG');
}

export async function admitRegistration(
  db: RequestDb,
  registrationId: number,
  options: { section_id?: number | null; admission_date?: string } = {}
): Promise<{ student: Record<string, unknown>; registration: RegistrationRow }> {
  const result = await db.query<RegistrationRow>(
    'SELECT * FROM student_registrations WHERE id = $1',
    [registrationId]
  );
  const registration = result.rows[0];
  if (!registration) {
    throw new RegistrationAdmitError('Registration not found', 404);
  }
  if (registration.converted_student_id) {
    throw new RegistrationAdmitError('Registration already admitted', 400);
  }
  if (registration.status === 'cancelled') {
    throw new RegistrationAdmitError('Cancelled registrations cannot be admitted', 400);
  }
  if (!registration.date_of_birth) {
    throw new RegistrationAdmitError('Add date of birth before admitting', 400);
  }
  if (!registration.class_id) {
    throw new RegistrationAdmitError('Select a class before admitting', 400);
  }

  const admissionDate = options.admission_date || new Date().toISOString().split('T')[0];
  const ageCheck = await assertClassAgeRestriction(db, {
    classId: registration.class_id,
    dateOfBirth: registration.date_of_birth,
    admissionDate,
  });
  if (!ageCheck.ok) {
    throw new RegistrationAdmitError(ageCheck.error, 400);
  }

  await ensureStudentMotherColumns(db);
  const admissionSettings = await getAdmissionNumberSettings(db);
  const admission_number = generateAdmissionNumberForSchool(admissionSettings);
  const lastName = registration.student_last_name?.trim() || '—';

  const studentResult = await db.query(
    `INSERT INTO students (
      admission_number, first_name, last_name, date_of_birth, gender,
      admission_date, parent_name, parent_phone, parent_email,
      mother_name, mother_phone, mother_email,
      aadhaar_no, religion, caste, category, nationality, blood_group,
      address, city, state, pincode, remarks, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,'active')
    RETURNING *`,
    [
      admission_number,
      registration.student_first_name,
      lastName,
      registration.date_of_birth,
      registration.gender || 'Male',
      admissionDate,
      registration.parent_name,
      registration.parent_phone,
      registration.parent_email,
      registration.mother_name || null,
      registration.mother_phone || null,
      registration.mother_email || null,
      registration.aadhaar_no || null,
      registration.religion || null,
      registration.social_category || registration.caste || null,
      registration.category || registration.social_category || null,
      registration.nationality || null,
      registration.blood_group || null,
      registration.address || null,
      registration.city || null,
      registration.state || null,
      registration.pincode || null,
      registration.remarks,
    ]
  );
  const student = studentResult.rows[0] as Record<string, unknown>;

  await createCurrentEnrollment(db, {
    studentId: student.id as number,
    classId: registration.class_id,
    sectionId: options.section_id ?? null,
  });

  const updated = await db.query<RegistrationRow>(
    `UPDATE student_registrations
     SET status = 'admitted', converted_student_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [student.id, registrationId]
  );

  return { student, registration: updated.rows[0] };
}
