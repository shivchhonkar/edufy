export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface LeaveRecord {
  id: number
  staff_id: number
  leave_type_id: number
  leave_type_name: string
  is_paid?: boolean
  max_days_per_year?: number
  first_name: string
  last_name: string
  employee_id?: string
  department_name?: string
  email?: string
  start_date: string
  end_date: string
  days_requested: number
  reason?: string
  status: LeaveStatus
  approved_by?: number
  approved_by_name?: string
  approved_at?: string
  remarks?: string
  created_at: string
  updated_at?: string
}

export interface LeaveType {
  id: number
  name: string
  description?: string
  is_paid?: boolean
  max_days_per_year?: number
}

export interface LeaveBalance {
  staff_id: number
  leave_type_id: number
  leave_type_name: string
  max_days_per_year?: number
  is_paid?: boolean
  year: number
  allocated: number
  used: number
  carried_forward?: number
}

export interface LeaveStats {
  total: number
  pending: number
  approved: number
  rejected: number
  cancelled: number
}

export interface StaffOption {
  id: number
  first_name: string
  last_name: string
  employee_id?: string
  department_name?: string
}
