export const STAFF_TYPES = [
  'ADMIN',
  'TEACHER',
  'OTHERS',
  'TRPT STAFF',
  'PRINCIPAL',
  'VICE PRINCIPAL',
  'OFFICE',
] as const;

export type StaffSubjectClassRow = { subject: string; class_name: string };

function emptyToNull(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function optionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function optionalInt(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function optionalBool(value: unknown): boolean {
  return value === true || value === 'true' || value === 'Yes' || value === 1 || value === '1';
}

function optionalTime(value: unknown): string | null {
  const s = emptyToNull(value);
  if (!s) return null;
  return s.length >= 5 ? s.slice(0, 5) : s;
}

export function parseSubjectClasses(value: unknown): StaffSubjectClassRow[] {
  if (typeof value === 'string') {
    try {
      return parseSubjectClasses(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const item = row as Record<string, unknown>;
      return {
        subject: String(item?.subject || '').trim(),
        class_name: String(item?.class_name || item?.class || '').trim(),
      };
    })
    .filter((row) => row.subject || row.class_name);
}

export function staffWriteValues(body: Record<string, unknown>) {
  return {
    first_name: String(body.first_name || '').trim(),
    last_name: String(body.last_name || '').trim(),
    date_of_birth: emptyToNull(body.date_of_birth),
    gender: emptyToNull(body.gender) || 'Male',
    phone: String(body.phone || '').trim(),
    email: emptyToNull(body.email),
    emergency_contact: emptyToNull(body.emergency_contact),
    address: emptyToNull(body.address),
    city: emptyToNull(body.city),
    state: emptyToNull(body.state),
    pincode: emptyToNull(body.pincode),
    designation: emptyToNull(body.designation),
    last_designation: emptyToNull(body.last_designation),
    department: emptyToNull(body.department),
    department_id: optionalInt(body.department_id),
    designation_id: optionalInt(body.designation_id),
    qualification: emptyToNull(body.qualification),
    experience_years: optionalInt(body.experience_years),
    date_of_joining: emptyToNull(body.date_of_joining),
    employment_type: emptyToNull(body.employment_type) || 'full_time',
    salary: optionalNumber(body.salary),
    notes: emptyToNull(body.notes),
    status_change_date: emptyToNull(body.status_change_date),
    photo_url: emptyToNull(body.photo_url),
    bank_account_number: emptyToNull(body.bank_account_number),
    bank_name: emptyToNull(body.bank_name),
    bank_ifsc: emptyToNull(body.bank_ifsc),
    staff_type: emptyToNull(body.staff_type),
    staff_category: emptyToNull(body.staff_category),
    father_husband_name: emptyToNull(body.father_husband_name),
    pan_number: emptyToNull(body.pan_number)?.toUpperCase() || null,
    aadhaar_number: emptyToNull(body.aadhaar_number),
    pf_account_no: emptyToNull(body.pf_account_no),
    pf_max: optionalNumber(body.pf_max),
    pf_uan: emptyToNull(body.pf_uan),
    esi_account_no: emptyToNull(body.esi_account_no),
    date_of_leaving: emptyToNull(body.date_of_leaving),
    transport_allowance: optionalNumber(body.transport_allowance),
    in_time: optionalTime(body.in_time),
    out_time: optionalTime(body.out_time),
    duty_hours: optionalNumber(body.duty_hours),
    restrict_holidays: optionalInt(body.restrict_holidays) ?? 0,
    overtime_allowed: optionalBool(body.overtime_allowed),
    overtime_hours: optionalNumber(body.overtime_hours),
    bank_account_name: emptyToNull(body.bank_account_name),
    bank_branch: emptyToNull(body.bank_branch),
    work_location: emptyToNull(body.work_location),
    class_teacher: emptyToNull(body.class_teacher),
    basic_salary: optionalNumber(body.basic_salary),
    travel_allowance: optionalNumber(body.travel_allowance),
    dearness_allowance: optionalNumber(body.dearness_allowance),
    other_allowance: optionalNumber(body.other_allowance),
    salary_effective_date: emptyToNull(body.salary_effective_date),
    subject_classes: parseSubjectClasses(body.subject_classes),
  };
}

export const STAFF_WRITE_COLUMNS = [
  'first_name',
  'last_name',
  'date_of_birth',
  'gender',
  'phone',
  'email',
  'emergency_contact',
  'address',
  'city',
  'state',
  'pincode',
  'designation',
  'last_designation',
  'department',
  'department_id',
  'designation_id',
  'qualification',
  'experience_years',
  'date_of_joining',
  'employment_type',
  'salary',
  'notes',
  'status_change_date',
  'photo_url',
  'bank_account_number',
  'bank_name',
  'bank_ifsc',
  'staff_type',
  'staff_category',
  'father_husband_name',
  'pan_number',
  'aadhaar_number',
  'pf_account_no',
  'pf_max',
  'pf_uan',
  'esi_account_no',
  'date_of_leaving',
  'transport_allowance',
  'in_time',
  'out_time',
  'duty_hours',
  'restrict_holidays',
  'overtime_allowed',
  'overtime_hours',
  'bank_account_name',
  'bank_branch',
  'work_location',
  'class_teacher',
  'basic_salary',
  'travel_allowance',
  'dearness_allowance',
  'other_allowance',
  'salary_effective_date',
  'subject_classes',
] as const;

export function staffWriteParams(fields: ReturnType<typeof staffWriteValues>) {
  return STAFF_WRITE_COLUMNS.map((column) => fields[column]);
}
