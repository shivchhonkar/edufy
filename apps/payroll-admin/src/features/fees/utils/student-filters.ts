import type { FeeStudentRow } from '@/features/fees/components/VirtualizedFeesStudentsTable';

export interface ClassSectionFilter {
  classId?: string;
  sectionId?: string;
}

export function matchesClassSection(
  student: Pick<FeeStudentRow, 'class_id' | 'section_id'>,
  { classId, sectionId }: ClassSectionFilter,
): boolean {
  if (classId && String(student.class_id ?? '') !== classId) return false;
  if (sectionId && String(student.section_id ?? '') !== sectionId) return false;
  return true;
}

export function matchesStudentSearch(
  student: FeeStudentRow,
  search: string,
): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const name = `${student.first_name} ${student.last_name}`.toLowerCase();
  return (
    student.admission_number?.toLowerCase().includes(q) ||
    name.includes(q) ||
    student.parent_phone?.includes(search.trim()) ||
    student.parent_name?.toLowerCase().includes(q) ||
    student.class_name?.toLowerCase().includes(q) ||
    student.section_name?.toLowerCase().includes(q)
  );
}

export function filterFeeStudents(
  students: FeeStudentRow[],
  options: ClassSectionFilter & { search?: string },
): FeeStudentRow[] {
  const { search = '', classId, sectionId } = options;
  return students.filter(
    (student) =>
      matchesClassSection(student, { classId, sectionId }) &&
      matchesStudentSearch(student, search),
  );
}
