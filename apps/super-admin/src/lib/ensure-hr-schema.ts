import type { RequestDb } from '@/lib/request-db';

const HR_TABLES_SQL = `
-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) UNIQUE,
  head_staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Designations
CREATE TABLE IF NOT EXISTS designations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  grade INTEGER DEFAULT 1,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  min_salary DECIMAL(12,2),
  max_salary DECIMAL(12,2),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, department_id)
);

-- Staff FK columns
ALTER TABLE staff ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS designation_id INTEGER REFERENCES designations(id) ON DELETE SET NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS reporting_manager_id INTEGER REFERENCES staff(id) ON DELETE SET NULL;

-- Staff documents
CREATE TABLE IF NOT EXISTS staff_documents (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  remarks TEXT,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_staff_documents_staff ON staff_documents(staff_id);

-- Leave types
CREATE TABLE IF NOT EXISTS leave_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_paid BOOLEAN DEFAULT FALSE,
  max_days_per_year INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO leave_types (name, description, is_paid, max_days_per_year) VALUES
  ('Sick Leave', 'Medical leave for illness', true, 12),
  ('Annual Leave', 'Vacation leave', true, 21),
  ('Personal Leave', 'Personal matters', false, 5),
  ('Maternity Leave', 'Maternity leave', true, 90),
  ('Paternity Leave', 'Paternity leave', true, 15),
  ('Emergency Leave', 'Family emergency', false, 3),
  ('Study Leave', 'Educational purposes', false, 10),
  ('Bereavement Leave', 'Death of family member', true, 7)
ON CONFLICT (name) DO NOTHING;

-- Staff leaves (enhanced)
CREATE TABLE IF NOT EXISTS staff_leaves (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  leave_type_id INTEGER REFERENCES leave_types(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested INTEGER NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_staff_leaves_staff_status ON staff_leaves(staff_id, status);

-- Leave balances
CREATE TABLE IF NOT EXISTS leave_balances (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  allocated DECIMAL(5,1) DEFAULT 0,
  used DECIMAL(5,1) DEFAULT 0,
  carried_forward DECIMAL(5,1) DEFAULT 0,
  UNIQUE(staff_id, leave_type_id, year)
);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO shifts (name, start_time, end_time, break_minutes) VALUES
  ('Morning Shift', '08:00:00', '14:00:00', 30),
  ('Day Shift', '09:00:00', '17:00:00', 60),
  ('Evening Shift', '14:00:00', '20:00:00', 30)
ON CONFLICT (name) DO NOTHING;

-- Staff shift assignments
CREATE TABLE IF NOT EXISTS staff_shift_assignments (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_staff_shift_staff ON staff_shift_assignments(staff_id, effective_from);

-- Attendance policies
CREATE TABLE IF NOT EXISTS attendance_policies (
  id SERIAL PRIMARY KEY,
  policy_name VARCHAR(100) NOT NULL,
  work_start_time TIME NOT NULL,
  work_end_time TIME NOT NULL,
  break_duration_minutes INTEGER DEFAULT 60,
  late_tolerance_minutes INTEGER DEFAULT 15,
  half_day_threshold_hours DECIMAL(4,2) DEFAULT 4.0,
  overtime_threshold_hours DECIMAL(4,2) DEFAULT 8.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO attendance_policies (policy_name, work_start_time, work_end_time, break_duration_minutes, late_tolerance_minutes)
SELECT 'Standard Policy', '09:00:00', '17:00:00', 60, 15
WHERE NOT EXISTS (SELECT 1 FROM attendance_policies LIMIT 1);

-- Salary components
CREATE TABLE IF NOT EXISTS salary_components (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  component_type VARCHAR(20) NOT NULL CHECK (component_type IN ('earning', 'deduction')),
  is_taxable BOOLEAN DEFAULT FALSE,
  is_statutory BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO salary_components (name, component_type, is_taxable) VALUES
  ('Basic Salary', 'earning', true),
  ('House Rent Allowance', 'earning', true),
  ('Dearness Allowance', 'earning', true),
  ('Conveyance Allowance', 'earning', false),
  ('Provident Fund', 'deduction', false),
  ('Professional Tax', 'deduction', false),
  ('Income Tax (TDS)', 'deduction', false)
ON CONFLICT (name) DO NOTHING;

-- Salary structures
CREATE TABLE IF NOT EXISTS salary_structures (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  designation_id INTEGER REFERENCES designations(id) ON DELETE SET NULL,
  staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS salary_structure_lines (
  id SERIAL PRIMARY KEY,
  structure_id INTEGER NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
  component_id INTEGER NOT NULL REFERENCES salary_components(id) ON DELETE CASCADE,
  amount DECIMAL(12,2),
  percentage_of_basic DECIMAL(5,2),
  UNIQUE(structure_id, component_id)
);

-- Staff promotions
CREATE TABLE IF NOT EXISTS staff_promotions (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  from_designation_id INTEGER REFERENCES designations(id) ON DELETE SET NULL,
  to_designation_id INTEGER REFERENCES designations(id) ON DELETE SET NULL,
  from_salary DECIMAL(12,2),
  to_salary DECIMAL(12,2),
  effective_date DATE NOT NULL,
  reason TEXT,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Salary increments
CREATE TABLE IF NOT EXISTS salary_increments (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  previous_salary DECIMAL(12,2) NOT NULL,
  new_salary DECIMAL(12,2) NOT NULL,
  increment_type VARCHAR(20) DEFAULT 'annual' CHECK (increment_type IN ('annual', 'promotion', 'special')),
  effective_date DATE NOT NULL,
  reason TEXT,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resignations
CREATE TABLE IF NOT EXISTS resignations (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  resignation_date DATE NOT NULL,
  last_working_day DATE NOT NULL,
  notice_period_days INTEGER DEFAULT 30,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cleared')),
  clearance_status VARCHAR(20) DEFAULT 'pending' CHECK (clearance_status IN ('pending', 'in_progress', 'completed')),
  exit_notes TEXT,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teacher assignments
CREATE TABLE IF NOT EXISTS teacher_assignments (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  academic_year VARCHAR(50) NOT NULL,
  is_class_teacher BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, class_id, section_id, subject_id, academic_year)
);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_staff ON teacher_assignments(staff_id);

-- Payroll runs (if missing)
CREATE TABLE IF NOT EXISTS payroll_runs (
  id SERIAL PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'processed', 'paid')),
  total_amount DECIMAL(14,2) DEFAULT 0,
  staff_count INTEGER DEFAULT 0,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month, year)
);

-- Extend payroll
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS payslip_generated_at TIMESTAMP;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS lop_days DECIMAL(5,1) DEFAULT 0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS structure_id INTEGER REFERENCES salary_structures(id) ON DELETE SET NULL;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS is_advance BOOLEAN DEFAULT FALSE;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) DEFAULT 0;

-- Backfill amount_paid for existing non-advance fully-paid rows
UPDATE payroll SET amount_paid = net_salary
WHERE status = 'paid' AND COALESCE(amount_paid, 0) = 0 AND net_salary IS NOT NULL
  AND COALESCE(is_advance, false) = false;

-- Extend payroll_runs
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMP;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS notes TEXT;

-- Punch machines (attendance integration)
CREATE TABLE IF NOT EXISTS punch_machines (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) UNIQUE NOT NULL,
  device_name VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  device_type VARCHAR(50) DEFAULT 'fingerprint',
  ip_address INET,
  port INTEGER,
  status VARCHAR(20) DEFAULT 'active',
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS punch_machine_logs (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) REFERENCES punch_machines(device_id),
  staff_id INTEGER REFERENCES staff(id),
  punch_time TIMESTAMP NOT NULL,
  punch_type VARCHAR(20),
  raw_data JSONB,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function reconcileStaffAttendance(db: RequestDb): Promise<void> {
  const tableCheck = await db.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'staff_attendance'
    ) AS exists
  `);

  if (!tableCheck.rows[0]?.exists) {
    await db.query(`
      CREATE TABLE staff_attendance (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
        attendance_date DATE NOT NULL,
        check_in_time TIME,
        check_out_time TIME,
        break_start_time TIME,
        break_end_time TIME,
        total_hours_worked DECIMAL(4,2),
        status VARCHAR(20) DEFAULT 'present',
        attendance_type VARCHAR(20) DEFAULT 'manual',
        device_id VARCHAR(50),
        location VARCHAR(100),
        remarks TEXT,
        created_by INTEGER REFERENCES staff(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(staff_id, attendance_date)
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date ON staff_attendance(staff_id, attendance_date)`);
    return;
  }

  const cols = await db.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_attendance'
  `);
  const colSet = new Set(cols.rows.map((r: { column_name: string }) => r.column_name));

  if (colSet.has('date') && !colSet.has('attendance_date')) {
    await db.query(`ALTER TABLE staff_attendance RENAME COLUMN date TO attendance_date`);
  }
  if (colSet.has('check_in') && !colSet.has('check_in_time')) {
    await db.query(`ALTER TABLE staff_attendance RENAME COLUMN check_in TO check_in_time`);
  }
  if (colSet.has('check_out') && !colSet.has('check_out_time')) {
    await db.query(`ALTER TABLE staff_attendance RENAME COLUMN check_out TO check_out_time`);
  }

  await db.query(`ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS attendance_date DATE`);
  await db.query(`ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS check_in_time TIME`);
  await db.query(`ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS check_out_time TIME`);
  await db.query(`ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS break_start_time TIME`);
  await db.query(`ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS break_end_time TIME`);
  await db.query(`ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS total_hours_worked DECIMAL(4,2)`);
  await db.query(`ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS attendance_type VARCHAR(20) DEFAULT 'manual'`);
  await db.query(`ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS device_id VARCHAR(50)`);
  await db.query(`ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS location VARCHAR(100)`);
  await db.query(`ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES staff(id)`);
  await db.query(`ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
}

async function seedDefaultDepartments(db: RequestDb): Promise<void> {
  const defaults = [
    { name: 'Teaching', code: 'TCH' },
    { name: 'Administration', code: 'ADM' },
    { name: 'Support', code: 'SUP' },
  ];
  for (const d of defaults) {
    await db.query(
      `INSERT INTO departments (name, code) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
      [d.name, d.code]
    );
  }
}

/** Idempotent — ensures all HR tables and reconciles attendance schema. */
export async function ensureHrSchema(db: RequestDb): Promise<void> {
  await db.query(HR_TABLES_SQL);
  await reconcileStaffAttendance(db);
  await seedDefaultDepartments(db);
}
