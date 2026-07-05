export type TimetableTab =
  | 'setup'
  | 'periods'
  | 'curriculum'
  | 'assignments'
  | 'availability'
  | 'builder'
  | 'teacher';

export interface TimetablePeriod {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  sort_order: number;
  is_active: boolean;
  slot_type?: string;
  is_schedulable?: boolean;
  period_category?: string;
}

export interface WorkingDay {
  day_of_week: number;
  day_name: string;
  is_working: boolean;
  teaching_period_count: number;
}

export interface TimetableEntry {
  id: number;
  day_of_week: number;
  period_id: number;
  subject_id: number | null;
  staff_id: number | null;
  room?: string | null;
  subject_name: string;
  teacher_name: string;
  period_name: string;
  is_inherited?: boolean;
  class_name?: string;
  section_name?: string | null;
}

export interface CurriculumSubject {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  weekly_periods: number;
  preferred_room: string;
  scheduled_periods: number;
}

export interface TimetableConflict {
  code: string;
  message: string;
}

export interface ClassOption {
  id: number;
  name: string;
}

export interface SectionOption {
  id: number;
  name: string;
}

export interface StaffOption {
  id: number;
  first_name: string;
  last_name: string;
}
