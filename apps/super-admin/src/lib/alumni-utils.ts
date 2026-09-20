export const ALUMNI_STATUSES = ['graduated', 'transferred', 'inactive'] as const;

export const HIGHER_ED_STATUS_OPTIONS = [
  { value: 'studying', label: 'Currently Studying' },
  { value: 'completed', label: 'Completed' },
  { value: 'dropped', label: 'Dropped' },
] as const;

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'self_employed', label: 'Self Employed' },
  { value: 'internship', label: 'Internship' },
  { value: 'contract', label: 'Contract' },
] as const;

export const ALUMNI_EVENT_TYPES = [
  { value: 'reunion', label: 'Reunion' },
  { value: 'networking', label: 'Networking' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'other', label: 'Other' },
] as const;

export const ALUMNI_EVENT_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export interface AlumniProfile {
  id: number;
  student_id: number;
  batch_year?: string | null;
  last_class?: string | null;
  last_section?: string | null;
  exit_date?: string | null;
  exit_reason?: string | null;
  current_email?: string | null;
  current_phone?: string | null;
  current_address?: string | null;
  current_city?: string | null;
  linkedin_url?: string | null;
  is_public: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlumniDirectoryItem extends AlumniProfile {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  full_name: string;
  admission_number: string;
  photo_url?: string | null;
  student_status: string;
  gender?: string | null;
}

export interface AlumniHigherEducation {
  id: number;
  alumni_id: number;
  student_id: number;
  institution_name: string;
  degree?: string | null;
  field_of_study?: string | null;
  start_year?: number | null;
  end_year?: number | null;
  status: string;
  country?: string | null;
  city?: string | null;
  remarks?: string | null;
  alumni_name?: string;
  admission_number?: string;
  created_at: string;
}

export interface AlumniEmployment {
  id: number;
  alumni_id: number;
  student_id: number;
  company_name: string;
  job_title?: string | null;
  industry?: string | null;
  employment_type: string;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  location?: string | null;
  remarks?: string | null;
  alumni_name?: string;
  admission_number?: string;
  created_at: string;
}

export interface AlumniEvent {
  id: number;
  title: string;
  description?: string | null;
  event_date: string;
  event_time?: string | null;
  venue?: string | null;
  event_type: string;
  max_attendees?: number | null;
  registration_deadline?: string | null;
  status: string;
  created_by?: number | null;
  created_by_name?: string | null;
  registration_count?: number;
  created_at: string;
}

export interface AlumniSuccessStory {
  id: number;
  alumni_id: number;
  student_id: number;
  title: string;
  story: string;
  achievement_summary?: string | null;
  photo_url?: string | null;
  is_published: boolean;
  published_at?: string | null;
  created_by?: number | null;
  created_by_name?: string | null;
  alumni_name?: string;
  admission_number?: string;
  batch_year?: string | null;
  created_at: string;
}

export function employmentTypeLabel(value: string): string {
  return EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === value)?.label || value;
}

export function higherEdStatusLabel(value: string): string {
  return HIGHER_ED_STATUS_OPTIONS.find((o) => o.value === value)?.label || value;
}

export function eventTypeLabel(value: string): string {
  return ALUMNI_EVENT_TYPES.find((o) => o.value === value)?.label || value;
}
