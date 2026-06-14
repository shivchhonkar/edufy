import { Student } from '@/shared/types';

export interface BulkEditRow {
  id: number;
  admission_number: string;
  student_code: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  aadhaar_no: string;
  religion: string;
  caste: string;
  category: string;
  nationality: string;
  mother_tongue: string;
  class_name: string;
  section_name: string;
  roll_number: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  emergency_contact: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  admission_date: string;
  status: string;
  remarks: string;
}

export type BulkEditColumnKey = keyof BulkEditRow | 'row_number';

export interface BulkEditColumn {
  key: BulkEditColumnKey;
  label: string;
  width: number;
  readOnly?: boolean;
  type?: 'text' | 'date' | 'select';
  options?: string[];
}

export const BULK_EDIT_COLUMNS: BulkEditColumn[] = [
  { key: 'row_number', label: '#', width: 48, readOnly: true },
  { key: 'admission_number', label: 'Admission No.', width: 120, readOnly: true },
  { key: 'student_code', label: 'Student Code', width: 110 },
  { key: 'first_name', label: 'First Name', width: 130 },
  { key: 'middle_name', label: 'Middle Name', width: 120 },
  { key: 'last_name', label: 'Last Name', width: 130 },
  { key: 'date_of_birth', label: 'Date of Birth', width: 130, type: 'date' },
  { key: 'gender', label: 'Gender', width: 100, type: 'select', options: ['Male', 'Female', 'Other'] },
  { key: 'class_name', label: 'Class', width: 110 },
  { key: 'section_name', label: 'Section', width: 90 },
  { key: 'roll_number', label: 'Roll No.', width: 90 },
  { key: 'blood_group', label: 'Blood Group', width: 100 },
  { key: 'category', label: 'Category', width: 100 },
  { key: 'nationality', label: 'Nationality', width: 100 },
  { key: 'parent_name', label: 'Parent Name', width: 140 },
  { key: 'parent_phone', label: 'Parent Phone', width: 120 },
  { key: 'parent_email', label: 'Parent Email', width: 160 },
  { key: 'emergency_contact', label: 'Emergency Contact', width: 130 },
  { key: 'address', label: 'Address', width: 180 },
  { key: 'city', label: 'City', width: 110 },
  { key: 'state', label: 'State', width: 110 },
  { key: 'pincode', label: 'Pincode', width: 90 },
  { key: 'admission_date', label: 'Admission Date', width: 130, type: 'date' },
  { key: 'status', label: 'Status', width: 110, type: 'select', options: ['active', 'inactive', 'graduated', 'transferred'] },
  { key: 'aadhaar_no', label: 'Aadhaar', width: 130 },
  { key: 'religion', label: 'Religion', width: 100 },
  { key: 'caste', label: 'Caste', width: 100 },
  { key: 'mother_tongue', label: 'Mother Tongue', width: 120 },
  { key: 'remarks', label: 'Remarks', width: 160 },
];

export const BULK_EDIT_TOTAL_WIDTH = BULK_EDIT_COLUMNS.reduce((sum, col) => sum + col.width, 0);

export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const dateStr = typeof date === 'string' ? date : date.toISOString();
  return dateStr.split('T')[0];
}

export function studentToBulkEditRow(student: Student): BulkEditRow {
  return {
    id: student.id,
    admission_number: student.admission_number || '',
    student_code: student.student_code || '',
    first_name: student.first_name || '',
    middle_name: student.middle_name || '',
    last_name: student.last_name || '',
    date_of_birth: formatDateForInput(student.date_of_birth),
    gender: student.gender || 'Male',
    blood_group: student.blood_group || '',
    aadhaar_no: student.aadhaar_no || '',
    religion: student.religion || '',
    caste: student.caste || '',
    category: student.category || '',
    nationality: student.nationality || '',
    mother_tongue: student.mother_tongue || '',
    class_name: student.class_name || '',
    section_name: student.section_name || '',
    roll_number: student.roll_number || '',
    parent_name: student.parent_name || '',
    parent_phone: student.parent_phone || '',
    parent_email: student.parent_email || '',
    emergency_contact: student.emergency_contact || '',
    address: student.address || '',
    city: student.city || '',
    state: student.state || '',
    pincode: student.pincode || '',
    admission_date: formatDateForInput(student.admission_date),
    status: student.status || 'active',
    remarks: student.remarks || '',
  };
}

export function rowSnapshot(row: BulkEditRow): string {
  return JSON.stringify(row);
}

export function isRowChanged(row: BulkEditRow, original: Map<number, string>): boolean {
  return original.get(row.id) !== rowSnapshot(row);
}

export interface BulkEditClassOption {
  id: number;
  name: string;
}

export interface BulkEditSectionOption {
  id: number;
  class_id?: number;
  name: string;
  assigned_classes?: Array<{ id: number; name: string }>;
}

export function buildSectionsByClassId(
  classes: BulkEditClassOption[],
  sections: BulkEditSectionOption[]
): Map<number, string[]> {
  const map = new Map<number, Set<string>>();
  classes.forEach((cls) => map.set(cls.id, new Set()));

  for (const section of sections) {
    const classIds = new Set<number>();
    if (section.class_id) classIds.add(section.class_id);
    section.assigned_classes?.forEach((ac) => classIds.add(ac.id));

    classIds.forEach((classId) => {
      const names = map.get(classId);
      if (names) names.add(section.name);
    });
  }

  const result = new Map<number, string[]>();
  map.forEach((names, classId) => {
    result.set(classId, [...names].sort((a, b) => a.localeCompare(b)));
  });
  return result;
}
