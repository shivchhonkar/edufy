export type AssignmentTab =
  | 'class-wise'
  | 'teacher-wise'
  | 'subject-wise'
  | 'bulk'
  | 'workload';

export interface TeacherAssignmentRow {
  id: number;
  staff_id: number;
  class_id: number;
  section_id: number | null;
  subject_id: number | null;
  academic_year: string;
  is_class_teacher: boolean;
  assigned_since: string;
  teacher_name: string;
  employee_id: string;
  class_name: string;
  section_name: string | null;
  subject_name: string | null;
  subject_code: string | null;
}

export interface ClassSubjectRow {
  id: number;
  class_id: number;
  subject_id: number;
  assigned_since: string;
  class_name: string;
  subject_name: string;
  subject_code: string;
}

export interface WorkloadRow {
  staff_id: number;
  teacher_name: string;
  employee_id: string;
  total_assignments: number;
  classes_count: number;
  subjects_count: number;
  sections_count: number;
  class_teacher_roles: number;
  timetable_periods: number;
}

export interface CoTeachingRow {
  class_id: number;
  section_id: number | null;
  subject_id: number;
  academic_year: string;
  class_name: string;
  section_name: string | null;
  subject_name: string;
  subject_code: string | null;
  teacher_count: number;
  teachers: {
    staff_id: number;
    teacher_name: string;
    employee_id: string;
    is_class_teacher: boolean;
    assigned_since: string;
  }[];
}

export interface AcademicAssignmentsOverview {
  assignments: TeacherAssignmentRow[];
  classSubjects: ClassSubjectRow[];
  workload: WorkloadRow[];
  coTeaching: CoTeachingRow[];
}

export interface AcademicYearOption {
  name: string;
  is_active?: boolean;
}

export interface StaffOption {
  id: number;
  first_name: string;
  last_name: string;
  employee_id?: string;
}

export interface ClassOption {
  id: number;
  name: string;
}

export interface SectionOption {
  id: number;
  class_id: number;
  name: string;
}

export interface SubjectOption {
  id: number;
  name: string;
  code?: string;
}

export interface ClassSubjectLink {
  class_id: number;
  subject_id: number;
  subject_name: string;
  subject_code?: string;
}

export function formatAssignedSince(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function sectionLabel(sectionName: string | null | undefined) {
  return sectionName?.trim() ? sectionName : 'All sections';
}
