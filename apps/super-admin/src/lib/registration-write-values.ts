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

function optionalBool(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1' || value === 'Yes';
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

export type RegistrationReference = { name: string; class_name: string; reg_id: string };
export type RegistrationExamSubject = { subject: string; max_marks: string; obtained_marks: string };
export type RegistrationPreviousExam = {
  roll_no: string;
  examination: string;
  university: string;
  year: string;
  subjects: string;
  obt_marks: string;
  total_marks: string;
  percent: string;
};
export type RegistrationSessionRow = {
  session: string;
  class_name: string;
  section: string;
  roll_no: string;
  reg_id: string;
  transport: string;
  location: string;
  bus_no: string;
  category: string;
  fee_type: string;
};
export type RegistrationDocumentRow = {
  doc_type: string;
  doc_name: string;
  file_type: string;
  file_name: string;
};

export function parseReferences(value: unknown): RegistrationReference[] {
  return parseJsonArray(value).map((row) => {
    const item = (row || {}) as Record<string, unknown>;
    return {
      name: String(item.name || '').trim(),
      class_name: String(item.class_name || item.class || '').trim(),
      reg_id: String(item.reg_id || '').trim(),
    };
  });
}

export function parseExamSubjects(value: unknown): RegistrationExamSubject[] {
  return parseJsonArray(value).map((row) => {
    const item = (row || {}) as Record<string, unknown>;
    return {
      subject: String(item.subject || '').trim(),
      max_marks: String(item.max_marks ?? item.mm ?? '').trim(),
      obtained_marks: String(item.obtained_marks ?? item.om ?? '').trim(),
    };
  });
}

export function parsePreviousEducation(value: unknown): RegistrationPreviousExam[] {
  return parseJsonArray(value).map((row) => {
    const item = (row || {}) as Record<string, unknown>;
    return {
      roll_no: String(item.roll_no || '').trim(),
      examination: String(item.examination || '').trim(),
      university: String(item.university || '').trim(),
      year: String(item.year || '').trim(),
      subjects: String(item.subjects || '').trim(),
      obt_marks: String(item.obt_marks || '').trim(),
      total_marks: String(item.total_marks || '').trim(),
      percent: String(item.percent || '').trim(),
    };
  });
}

export function parseSessionRows(value: unknown): RegistrationSessionRow[] {
  return parseJsonArray(value).map((row) => {
    const item = (row || {}) as Record<string, unknown>;
    return {
      session: String(item.session || '').trim(),
      class_name: String(item.class_name || '').trim(),
      section: String(item.section || '').trim(),
      roll_no: String(item.roll_no || '').trim(),
      reg_id: String(item.reg_id || '').trim(),
      transport: String(item.transport || '').trim(),
      location: String(item.location || '').trim(),
      bus_no: String(item.bus_no || '').trim(),
      category: String(item.category || '').trim(),
      fee_type: String(item.fee_type || '').trim(),
    };
  });
}

export function parseDocuments(value: unknown): RegistrationDocumentRow[] {
  return parseJsonArray(value).map((row) => {
    const item = (row || {}) as Record<string, unknown>;
    return {
      doc_type: String(item.doc_type || '').trim(),
      doc_name: String(item.doc_name || '').trim(),
      file_type: String(item.file_type || '').trim(),
      file_name: String(item.file_name || '').trim(),
    };
  });
}

export const REGISTRATION_WRITE_COLUMNS = [
  'student_first_name',
  'student_last_name',
  'student_email',
  'date_of_birth',
  'gender',
  'aadhaar_no',
  'social_category',
  'religion',
  'nationality',
  'parent_name',
  'parent_phone',
  'parent_email',
  'father_qualification',
  'father_occupation',
  'father_office_address',
  'father_aadhaar',
  'father_age',
  'father_annual_income',
  'mother_name',
  'mother_phone',
  'mother_email',
  'mother_qualification',
  'mother_occupation',
  'mother_office_address',
  'mother_aadhaar',
  'mother_age',
  'mother_annual_income',
  'guardian_name',
  'guardian_phone',
  'guardian_email',
  'guardian_address',
  'guardian_relation',
  'guardian_marital_status',
  'guardian_link_staff',
  'class_id',
  'academic_year',
  'registration_date',
  'fee_amount',
  'fee_type',
  'receipt_number',
  'reporting_mobile',
  'live_class',
  'permanent_address',
  'address',
  'city',
  'state',
  'pincode',
  'location',
  'samagra_id',
  'student_category',
  'category',
  'sub_caste',
  'fees_from',
  'last_school',
  'last_class',
  'last_division',
  'year_of_passing',
  'board_university',
  'school_transport',
  'bus_no',
  'transport_shift',
  'bank_name',
  'ifsc_code',
  'account_no',
  'branch',
  'saturday_activity',
  'handicapped',
  'handicapped_percent',
  'blood_group',
  'height_cm',
  'weight_kg',
  'ration_card',
  'ration_type',
  'ration_no',
  'medium',
  'local_address',
  'legal_address',
  'husband_address',
  'remarks',
  'reference_contacts',
  'exam_subjects',
  'previous_education',
  'session_rows',
  'documents',
] as const;

export type RegistrationWriteValues = {
  student_first_name: string;
  student_last_name: string | null;
  student_email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  aadhaar_no: string | null;
  social_category: string | null;
  religion: string | null;
  nationality: string | null;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  father_qualification: string | null;
  father_occupation: string | null;
  father_office_address: string | null;
  father_aadhaar: string | null;
  father_age: number | null;
  father_annual_income: number | null;
  mother_name: string | null;
  mother_phone: string | null;
  mother_email: string | null;
  mother_qualification: string | null;
  mother_occupation: string | null;
  mother_office_address: string | null;
  mother_aadhaar: string | null;
  mother_age: number | null;
  mother_annual_income: number | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  guardian_address: string | null;
  guardian_relation: string | null;
  guardian_marital_status: string | null;
  guardian_link_staff: string | null;
  class_id: number | null;
  academic_year: string | null;
  registration_date: string | null;
  fee_amount: number | null;
  fee_type: string | null;
  receipt_number: string | null;
  reporting_mobile: string | null;
  live_class: string | null;
  permanent_address: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  location: string | null;
  samagra_id: string | null;
  student_category: string | null;
  category: string | null;
  sub_caste: string | null;
  fees_from: string | null;
  last_school: string | null;
  last_class: string | null;
  last_division: string | null;
  year_of_passing: string | null;
  board_university: string | null;
  school_transport: boolean;
  bus_no: string | null;
  transport_shift: string | null;
  bank_name: string | null;
  ifsc_code: string | null;
  account_no: string | null;
  branch: string | null;
  saturday_activity: string | null;
  handicapped: boolean;
  handicapped_percent: number | null;
  blood_group: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  ration_card: boolean;
  ration_type: string | null;
  ration_no: string | null;
  medium: string | null;
  local_address: string | null;
  legal_address: string | null;
  husband_address: string | null;
  remarks: string | null;
  reference_contacts: RegistrationReference[];
  exam_subjects: RegistrationExamSubject[];
  previous_education: RegistrationPreviousExam[];
  session_rows: RegistrationSessionRow[];
  documents: RegistrationDocumentRow[];
};

export function registrationWriteValues(body: Record<string, unknown>): RegistrationWriteValues {
  const fatherName = emptyToNull(body.father_name) || emptyToNull(body.parent_name) || '';
  const fatherPhone = emptyToNull(body.father_phone) || emptyToNull(body.parent_phone) || '';
  const fatherEmail = emptyToNull(body.father_email) || emptyToNull(body.parent_email);

  return {
    student_first_name: String(body.student_first_name || body.student_name || '').trim(),
    student_last_name: emptyToNull(body.student_last_name),
    student_email: emptyToNull(body.student_email),
    date_of_birth: emptyToNull(body.date_of_birth),
    gender: emptyToNull(body.gender),
    aadhaar_no: emptyToNull(body.aadhaar_no),
    social_category: emptyToNull(body.social_category),
    religion: emptyToNull(body.religion),
    nationality: emptyToNull(body.nationality),
    parent_name: fatherName,
    parent_phone: fatherPhone,
    parent_email: fatherEmail,
    father_qualification: emptyToNull(body.father_qualification),
    father_occupation: emptyToNull(body.father_occupation),
    father_office_address: emptyToNull(body.father_office_address),
    father_aadhaar: emptyToNull(body.father_aadhaar),
    father_age: optionalNumber(body.father_age),
    father_annual_income: optionalNumber(body.father_annual_income),
    mother_name: emptyToNull(body.mother_name),
    mother_phone: emptyToNull(body.mother_phone),
    mother_email: emptyToNull(body.mother_email),
    mother_qualification: emptyToNull(body.mother_qualification),
    mother_occupation: emptyToNull(body.mother_occupation),
    mother_office_address: emptyToNull(body.mother_office_address),
    mother_aadhaar: emptyToNull(body.mother_aadhaar),
    mother_age: optionalNumber(body.mother_age),
    mother_annual_income: optionalNumber(body.mother_annual_income),
    guardian_name: emptyToNull(body.guardian_name),
    guardian_phone: emptyToNull(body.guardian_phone),
    guardian_email: emptyToNull(body.guardian_email),
    guardian_address: emptyToNull(body.guardian_address),
    guardian_relation: emptyToNull(body.guardian_relation),
    guardian_marital_status: emptyToNull(body.guardian_marital_status),
    guardian_link_staff: emptyToNull(body.guardian_link_staff),
    class_id: optionalNumber(body.class_id),
    academic_year: emptyToNull(body.academic_year),
    registration_date: emptyToNull(body.registration_date),
    fee_amount: optionalNumber(body.fee_amount),
    fee_type: emptyToNull(body.fee_type),
    receipt_number: emptyToNull(body.receipt_number),
    reporting_mobile: emptyToNull(body.reporting_mobile),
    live_class: emptyToNull(body.live_class) || 'Y',
    permanent_address: emptyToNull(body.permanent_address),
    address: emptyToNull(body.address) || emptyToNull(body.residential_address),
    city: emptyToNull(body.city),
    state: emptyToNull(body.state),
    pincode: emptyToNull(body.pincode),
    location: emptyToNull(body.location),
    samagra_id: emptyToNull(body.samagra_id),
    student_category: emptyToNull(body.student_category),
    category: emptyToNull(body.category),
    sub_caste: emptyToNull(body.sub_caste),
    fees_from: emptyToNull(body.fees_from),
    last_school: emptyToNull(body.last_school),
    last_class: emptyToNull(body.last_class),
    last_division: emptyToNull(body.last_division),
    year_of_passing: emptyToNull(body.year_of_passing),
    board_university: emptyToNull(body.board_university),
    school_transport: optionalBool(body.school_transport),
    bus_no: emptyToNull(body.bus_no),
    transport_shift: emptyToNull(body.transport_shift),
    bank_name: emptyToNull(body.bank_name),
    ifsc_code: emptyToNull(body.ifsc_code),
    account_no: emptyToNull(body.account_no),
    branch: emptyToNull(body.branch),
    saturday_activity: emptyToNull(body.saturday_activity),
    handicapped: optionalBool(body.handicapped),
    handicapped_percent: optionalNumber(body.handicapped_percent),
    blood_group: emptyToNull(body.blood_group),
    height_cm: optionalNumber(body.height_cm),
    weight_kg: optionalNumber(body.weight_kg),
    ration_card: optionalBool(body.ration_card),
    ration_type: emptyToNull(body.ration_type),
    ration_no: emptyToNull(body.ration_no),
    medium: emptyToNull(body.medium),
    local_address: emptyToNull(body.local_address),
    legal_address: emptyToNull(body.legal_address),
    husband_address: emptyToNull(body.husband_address),
    remarks: emptyToNull(body.remarks),
    reference_contacts: parseReferences(body.reference_contacts || body.references).filter((row) => row.name || row.class_name || row.reg_id),
    exam_subjects: parseExamSubjects(body.exam_subjects).filter(
      (row) => row.subject || row.max_marks || row.obtained_marks
    ),
    previous_education: parsePreviousEducation(body.previous_education).filter((row) =>
      Object.values(row).some(Boolean)
    ),
    session_rows: parseSessionRows(body.session_rows).filter((row) => Object.values(row).some(Boolean)),
    documents: parseDocuments(body.documents).filter((row) => Object.values(row).some(Boolean)),
  };
}
