export const STUDENT_TYPES = ['regular', 'day_boarding', 'hostler'] as const;
export type StudentType = (typeof STUDENT_TYPES)[number];

export const STUDENT_TITLES = ['Mst.', 'Miss.'] as const;

export type EnquiryStudentSlot = {
  title: string;
  name: string;
  class_id: number | null;
  date_of_birth: string | null;
  email: string | null;
  last_school: string | null;
};

export type EnquirySibling = {
  name: string;
  class_name: string;
  school: string;
};

function emptyToNull(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function optionalInt(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function optionalBool(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function isValidStudentType(value: string): value is StudentType {
  return STUDENT_TYPES.includes(value as StudentType);
}

export function genderFromTitle(title: string | null | undefined): string | null {
  const t = (title || '').toLowerCase();
  if (t.startsWith('miss') || t.startsWith('km')) return 'Female';
  if (t.startsWith('mst') || t.startsWith('master')) return 'Male';
  return null;
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function parseAdditionalStudents(value: unknown): EnquiryStudentSlot[] {
  return parseJsonArray(value)
    .map((row) => {
      const item = (row || {}) as Record<string, unknown>;
      return {
        title: emptyToNull(item.title) || 'Mst.',
        name: String(item.name || '').trim(),
        class_id: optionalInt(item.class_id),
        date_of_birth: emptyToNull(item.date_of_birth),
        email: emptyToNull(item.email),
        last_school: emptyToNull(item.last_school),
      };
    })
    .filter((row) => row.name);
}

export function parseSiblings(value: unknown): EnquirySibling[] {
  return parseJsonArray(value)
    .map((row) => {
      const item = (row || {}) as Record<string, unknown>;
      return {
        name: String(item.name || '').trim(),
        class_name: String(item.class_name || item.class || '').trim(),
        school: String(item.school || '').trim(),
      };
    })
    .filter((row) => row.name || row.class_name || row.school);
}

export function inquiryWriteValues(body: Record<string, unknown>) {
  const studentTitle = emptyToNull(body.student_title) || 'Mst.';
  const fatherName = emptyToNull(body.father_name) || emptyToNull(body.parent_name);
  const fatherPhone = emptyToNull(body.father_phone) || emptyToNull(body.parent_phone);
  const fatherEmail = emptyToNull(body.father_email) || emptyToNull(body.parent_email);
  const numberOfStudents = Math.min(3, Math.max(1, optionalInt(body.number_of_students) || 1));
  const studentTypeRaw = emptyToNull(body.student_type) || 'regular';
  const studentType = isValidStudentType(studentTypeRaw) ? studentTypeRaw : 'regular';

  return {
    student_first_name: String(body.student_first_name || '').trim(),
    student_last_name: emptyToNull(body.student_last_name),
    student_title: studentTitle,
    date_of_birth: emptyToNull(body.date_of_birth),
    gender: emptyToNull(body.gender) || genderFromTitle(studentTitle),
    student_email: emptyToNull(body.student_email),
    last_school: emptyToNull(body.last_school),
    parent_relation: emptyToNull(body.parent_relation) || 'father',
    parent_name: fatherName || '',
    parent_phone: fatherPhone || '',
    parent_email: fatherEmail,
    father_qualification: emptyToNull(body.father_qualification),
    father_occupation: emptyToNull(body.father_occupation),
    father_office_address: emptyToNull(body.father_office_address),
    mother_name: emptyToNull(body.mother_name),
    mother_phone: emptyToNull(body.mother_phone),
    mother_email: emptyToNull(body.mother_email),
    mother_qualification: emptyToNull(body.mother_qualification),
    mother_occupation: emptyToNull(body.mother_occupation),
    mother_office_address: emptyToNull(body.mother_office_address),
    address: emptyToNull(body.address) || emptyToNull(body.residential_address),
    city: emptyToNull(body.city),
    state: emptyToNull(body.state),
    pincode: emptyToNull(body.pincode),
    location: emptyToNull(body.location),
    reporting: emptyToNull(body.reporting),
    reporting_mobile: emptyToNull(body.reporting_mobile),
    interested_class_id: optionalInt(body.interested_class_id),
    academic_year: emptyToNull(body.academic_year),
    inquiry_date: emptyToNull(body.inquiry_date),
    number_of_students: numberOfStudents,
    is_cancelled: optionalBool(body.is_cancelled),
    student_type: studentType,
    source: emptyToNull(body.source) || 'walk_in',
    priority: emptyToNull(body.priority) || 'normal',
    follow_up_date: emptyToNull(body.follow_up_date),
    remarks: emptyToNull(body.remarks),
    additional_students: parseAdditionalStudents(body.additional_students),
    siblings: parseSiblings(body.siblings),
  };
}
