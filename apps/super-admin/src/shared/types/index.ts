// User and Authentication Types
export interface User {
  id: number;
  email: string;
  role: 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent' | 'transport_manager' | 'inventory_manager';
  full_name: string;
  phone?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Student Types
export interface Student {
  id: number;
  user_id?: number;
  admission_number: string;
  student_code?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: Date;
  gender: 'Male' | 'Female' | 'Other';
  blood_group?: string;
  aadhaar_no?: string;
  religion?: string;
  caste?: string;
  category?: string;
  nationality?: string;
  mother_tongue?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  admission_date: Date;
  class_id?: number;
  section_id?: number;
  class_name?: string;
  section_name?: string;
  roll_number?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  emergency_contact?: string;
  photo_url?: string;
  remarks?: string;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  created_at: Date;
  updated_at: Date;
}

export type GuardianRelationType = 'father' | 'mother' | 'guardian';

export interface StudentGuardian {
  id: number;
  student_id: number;
  relation_type: GuardianRelationType;
  name: string;
  mobile?: string;
  alternate_mobile?: string;
  email?: string;
  occupation?: string;
  annual_income?: number;
  company_name?: string;
  aadhaar_no?: string;
  photo?: string;
  is_primary_contact: boolean;
  created_at: Date;
  updated_at: Date;
}

export type StudentDocumentType =
  | 'birth_certificate'
  | 'aadhaar_card'
  | 'transfer_certificate'
  | 'migration_certificate'
  | 'marksheet'
  | 'income_certificate'
  | 'caste_certificate'
  | 'passport_photo'
  | 'medical_certificate'
  | 'report_card';

export interface StudentDocument {
  id: number;
  student_id: number;
  document_type: StudentDocumentType;
  file_name: string;
  file_path: string;
  issue_date?: Date;
  expiry_date?: Date;
  remarks?: string;
  uploaded_by?: number;
  uploaded_at: Date;
}

export interface StudentMedicalRecord {
  id: number;
  student_id: number;
  blood_group?: string;
  allergies?: string;
  chronic_disease?: string;
  disability?: string;
  doctor_name?: string;
  doctor_contact?: string;
  emergency_contact?: string;
  medical_notes?: string;
  created_at: Date;
  updated_at: Date;
}

export type StudentEnrollmentStatus = 'active' | 'promoted' | 'repeated' | 'transferred' | 'left';

export interface StudentEnrollment {
  id: number;
  student_id: number;
  academic_year_id?: number;
  academic_year: string;
  class_id?: number;
  section_id?: number;
  roll_number?: string;
  stream_id?: number;
  house_id?: number;
  status: StudentEnrollmentStatus;
  is_current: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TransferCertificateGeneration {
  id: number;
  student_id: number;
  tc_number: string;
  generated_by: number | null;
  generated_by_name: string | null;
  generated_at: string;
  academic_year: string | null;
  student_snapshot: Record<string, unknown>;
  school_snapshot: Record<string, unknown>;
  options: Record<string, unknown>;
}

// Class and Section Types
export interface Class {
  id: number;
  name: string;
  description?: string;
  academic_year: string;
  is_active?: boolean;
  section_count?: number;
  student_count?: number;
  created_at: Date;
}

export interface Section {
  id: number;
  class_id?: number;
  name: string;
  capacity?: number;
  class_teacher_id?: number;
  is_active?: boolean;
  student_count?: number;
  class_count?: number;
  assigned_classes?: Array<{ id: number; name: string }>;
  created_at: Date;
}

export interface ClassSection {
  id: number;
  class_id: number;
  section_id: number;
  class_name?: string;
  section_name?: string;
  created_at: Date;
}

// Fee Types
export interface FeeCategory {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
}

export interface FeeStructure {
  id: number;
  class_id?: number;
  category_id?: number;
  fee_type: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'one_time';
  academic_year: string;
  description?: string;
  is_active: boolean;
  late_fee_percentage: number;
  late_fee_days: number;
  created_at: Date;
}

export interface StudentFee {
  id: number;
  student_id: number;
  fee_structure_id?: number;
  academic_year: string;
  amount_due: number;
  amount_paid: number;
  discount_amount: number;
  late_fee_amount: number;
  due_date: Date;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';
  month?: number;
  remarks?: string;
  created_at: Date;
  updated_at: Date;
  calculated_late_fee?: number;
}

export interface FeePayment {
  id: number;
  student_id: number;
  fee_structure_id?: number;
  student_fee_id?: number;
  amount_paid: number;
  payment_date: Date;
  payment_method: 'cash' | 'online' | 'cheque' | 'card';
  transaction_id?: string;
  receipt_number?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  remarks?: string;
  created_by?: number;
  discount_applied?: number;
  late_fee_charged?: number;
  month?: number;
  academic_year?: string;
  created_at: Date;
}

export interface FeeDiscount {
  id: number;
  student_id: number;
  fee_structure_id?: number;
  discount_type: 'percentage' | 'fixed' | 'scholarship' | 'sibling' | 'merit' | 'other';
  discount_value: number;
  reason?: string;
  valid_from: Date;
  valid_until?: Date;
  approved_by?: number;
  is_active: boolean;
  created_at: Date;
}

// Attendance Types
export interface Attendance {
  id: number;
  student_id: number;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
  remarks?: string;
  marked_by?: number;
  created_at: Date;
}

// Homework Types
export interface Homework {
  id: number;
  class_id?: number;
  section_id?: number;
  subject_id?: number;
  title: string;
  description?: string;
  assigned_date: Date;
  due_date: Date;
  total_marks?: number;
  assigned_by?: number;
  attachment_url?: string;
  created_at: Date;
}

export interface HomeworkSubmission {
  id: number;
  homework_id: number;
  student_id: number;
  submission_date?: Date;
  submission_url?: string;
  marks_obtained?: number;
  remarks?: string;
  status: 'pending' | 'submitted' | 'graded' | 'late';
  graded_by?: number;
  created_at: Date;
}

// Subject Types
export interface Subject {
  id: number;
  name: string;
  code?: string;
  description?: string;
  created_at: Date;
}

// Exam and Results Types
export interface Exam {
  id: number;
  name: string;
  exam_type: 'unit_test' | 'mid_term' | 'final' | 'practical' | 'other';
  class_id?: number;
  academic_year: string;
  start_date: Date;
  end_date: Date;
  total_marks?: number;
  created_at: Date;
}

export interface Result {
  id: number;
  student_id: number;
  exam_id: number;
  exam_subject_id?: number;
  marks_obtained?: number;
  grade?: string;
  remarks?: string;
  created_at: Date;
}

// Staff Types
export interface Staff {
  id: number;
  user_id?: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: Date;
  gender: 'Male' | 'Female' | 'Other';
  blood_group?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone: string;
  email?: string;
  emergency_contact?: string;
  designation?: string;
  last_designation?: string;
  department?: string;
  qualification?: string;
  experience_years?: number;
  date_of_joining: Date;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'temporary';
  salary?: number;
  bank_account_number?: string;
  bank_name?: string;
  bank_ifsc?: string;
  photo_url?: string;
  documents?: any;
  status: 'active' | 'inactive' | 'resigned' | 'terminated';
  notes?: string;
  status_change_date?: Date | string;
  created_at: Date;
  updated_at: Date;
}

export interface StaffAttendance {
  id: number;
  staff_id: number;
  date: Date;
  check_in?: string;
  check_out?: string;
  status: 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday';
  remarks?: string;
  created_at: Date;
}

export interface Payroll {
  id: number;
  staff_id: number;
  month: number;
  year: number;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  payment_date?: Date;
  payment_method?: string;
  transaction_id?: string;
  status: 'pending' | 'processed' | 'paid';
  remarks?: string;
  created_at: Date;
}

// Transport Types
export interface Vehicle {
  id: number;
  vehicle_number: string;
  vehicle_type: 'bus' | 'van' | 'car';
  model?: string;
  capacity: number;
  registration_date?: Date;
  insurance_expiry?: Date;
  pollution_certificate_expiry?: Date;
  fitness_certificate_expiry?: Date;
  owner_name?: string;
  owner_phone?: string;
  driver_name?: string;
  driver_phone?: string;
  driver_license?: string;
  status: 'active' | 'maintenance' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface Driver {
  id: number;
  user_id?: number;
  name: string;
  phone: string;
  license_number: string;
  license_expiry: Date;
  address?: string;
  photo_url?: string;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface Route {
  id: number;
  route_name: string;
  route_number?: string;
  starting_point?: string;
  ending_point?: string;
  total_distance?: number;
  estimated_time?: number;
  status: 'active' | 'inactive';
  created_at: Date;
}

export interface RouteStop {
  id: number;
  route_id: number;
  stop_name: string;
  stop_order: number;
  arrival_time?: string;
  pickup_fee?: number;
  created_at: Date;
}

// Inventory Types
export interface InventoryCategory {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
}

export interface InventoryItem {
  id: number;
  category_id?: number;
  item_name: string;
  item_code?: string;
  description?: string;
  unit?: string;
  quantity: number;
  min_stock_level?: number;
  unit_price?: number;
  supplier_name?: string;
  supplier_contact?: string;
  location?: string;
  photo_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryTransaction {
  id: number;
  item_id?: number;
  transaction_type: 'purchase' | 'issue' | 'return' | 'damage' | 'adjustment';
  quantity: number;
  transaction_date: Date;
  issued_to_type?: string;
  issued_to_id?: number;
  unit_price?: number;
  total_amount?: number;
  remarks?: string;
  created_by?: number;
  created_at: Date;
}

// Dashboard Stats
export interface DashboardStats {
  total_students: number;
  total_staff: number;
  total_classes: number;
  total_vehicles: number;
  present_today: number;
  absent_today: number;
  pending_fees: number;
  low_stock_items: number;
}

export interface DashboardAttendancePoint {
  date: string;
  label: string;
  present: number;
  total: number;
  rate: number;
}

export interface DashboardFeePoint {
  month: string;
  label: string;
  amount: number;
}

export interface DashboardClassSlot {
  period_name: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_name: string;
  class_name: string;
  section_name: string | null;
}

export interface DashboardTeacherRank {
  teacher_name: string;
  score: number;
  rank: number;
  syllabus_progress_pct: number;
  activity_count: number;
}

export interface DashboardAlert {
  type: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  href?: string;
}

export interface DashboardActivity {
  title: string;
  subtitle: string;
  time: string;
  type: string;
}

export interface DashboardOverview extends DashboardStats {
  total_teachers: number;
  fees_collected: number;
  attendance_rate: number;
  attendance_marked: number;
  attendance_chart: DashboardAttendancePoint[];
  fee_collection_chart: DashboardFeePoint[];
  todays_classes: DashboardClassSlot[];
  classes_conducted_today: number;
  teacher_performance: DashboardTeacherRank[];
  alerts: DashboardAlert[];
  recent_activities: DashboardActivity[];
  admissions: {
    total: number;
    active: number;
    follow_up_today: number;
    new_this_week: number;
  };
  exams: {
    upcoming: number;
    total: number;
  };
  transport: {
    active_routes: number;
    student_assignments: number;
    active_vehicles: number;
  };
  library: {
    total_items: number;
    low_stock: number;
  };
}

export interface AnalyticsKpis {
  total_students: number;
  total_staff: number;
  total_teachers: number;
  total_classes: number;
  fees_collected: number;
  pending_fees: number;
  collection_rate: number;
  attendance_rate_today: number;
  avg_attendance_7d: number;
  avg_attendance_30d: number;
  active_admissions: number;
  new_admissions_month: number;
  fee_payments_month: number;
  upcoming_exams: number;
}

export interface AnalyticsOverview {
  kpis: AnalyticsKpis;
  attendance_trend_30d: DashboardAttendancePoint[];
  fee_collection_12m: DashboardFeePoint[];
  students_by_class: Array<{ name: string; count: number }>;
  admissions_by_status: Array<{ name: string; count: number }>;
  admissions_trend_6m: Array<{ month: string; label: string; count: number }>;
  staff_by_department: Array<{ name: string; count: number }>;
}

export type ActivityLogCategory =
  | 'payment'
  | 'admission'
  | 'student'
  | 'communication'
  | 'exam'
  | 'staff'
  | 'attendance';

export interface ActivityLogEntry {
  id: string;
  category: ActivityLogCategory;
  title: string;
  description: string;
  occurred_at: string;
  href?: string;
}

export interface ActivityLogsResponse {
  items: ActivityLogEntry[];
  total: number;
  page: number;
  limit: number;
  categories: Array<{ id: ActivityLogCategory | 'all'; label: string; count: number }>;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

