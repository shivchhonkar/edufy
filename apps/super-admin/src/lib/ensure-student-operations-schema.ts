import type { RequestDb } from '@/lib/request-db';

export async function ensureStudentOperationsSchema(db: RequestDb): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS student_registrations (
      id SERIAL PRIMARY KEY,
      registration_number VARCHAR(50) NOT NULL UNIQUE,
      inquiry_id INTEGER REFERENCES admission_inquiries(id) ON DELETE SET NULL,
      student_first_name VARCHAR(120) NOT NULL,
      student_last_name VARCHAR(120),
      date_of_birth DATE,
      gender VARCHAR(20),
      parent_name VARCHAR(200) NOT NULL,
      parent_phone VARCHAR(20) NOT NULL,
      parent_email VARCHAR(200),
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      academic_year VARCHAR(20),
      registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
      fee_amount NUMERIC(12,2),
      receipt_number VARCHAR(80),
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'admitted', 'cancelled')
      ),
      remarks TEXT,
      converted_student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_by_name VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_student_registrations_status
      ON student_registrations (status, registration_date DESC);
    CREATE INDEX IF NOT EXISTS idx_student_registrations_class
      ON student_registrations (class_id, registration_date DESC);

    CREATE TABLE IF NOT EXISTS student_physical_reports (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      academic_year VARCHAR(20),
      report_date DATE NOT NULL DEFAULT CURRENT_DATE,
      height_cm NUMERIC(6,2),
      weight_kg NUMERIC(6,2),
      bmi NUMERIC(6,2),
      chest_cm NUMERIC(6,2),
      vision_left VARCHAR(40),
      vision_right VARCHAR(40),
      blood_group VARCHAR(20),
      remarks TEXT,
      student_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      recorded_by_name VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_physical_reports_student
      ON student_physical_reports (student_id, report_date DESC);
    CREATE INDEX IF NOT EXISTS idx_physical_reports_date
      ON student_physical_reports (report_date DESC);

    CREATE TABLE IF NOT EXISTS ptm_schedules (
      id SERIAL PRIMARY KEY,
      academic_year VARCHAR(20),
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
      title VARCHAR(200) NOT NULL,
      scheduled_date DATE NOT NULL,
      start_time VARCHAR(20),
      end_time VARCHAR(20),
      venue VARCHAR(200),
      remarks TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_by_name VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ptm_schedules_date
      ON ptm_schedules (scheduled_date DESC, class_id);

    CREATE TABLE IF NOT EXISTS ptm_attendance (
      id SERIAL PRIMARY KEY,
      schedule_id INTEGER NOT NULL REFERENCES ptm_schedules(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      parent_attended BOOLEAN NOT NULL DEFAULT false,
      remarks TEXT,
      marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      marked_by_name VARCHAR(200),
      marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (schedule_id, student_id)
    );

    CREATE INDEX IF NOT EXISTS idx_ptm_attendance_schedule
      ON ptm_attendance (schedule_id);

    CREATE TABLE IF NOT EXISTS student_issued_certificates (
      id SERIAL PRIMARY KEY,
      certificate_type VARCHAR(30) NOT NULL CHECK (
        certificate_type IN ('dob', 'character', 'study')
      ),
      certificate_number VARCHAR(80) NOT NULL UNIQUE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      academic_year VARCHAR(20),
      issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
      purpose VARCHAR(200),
      remarks TEXT,
      student_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      school_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_by_name VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_issued_certs_type
      ON student_issued_certificates (certificate_type, issue_date DESC);
    CREATE INDEX IF NOT EXISTS idx_issued_certs_student
      ON student_issued_certificates (student_id, issue_date DESC);

    CREATE TABLE IF NOT EXISTS student_activities (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      academic_year VARCHAR(20),
      activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
      title VARCHAR(200) NOT NULL,
      category VARCHAR(80),
      award VARCHAR(200),
      remarks TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_by_name VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_student_activities_student
      ON student_activities (student_id, activity_date DESC);

    CREATE TABLE IF NOT EXISTS student_late_passes (
      id SERIAL PRIMARY KEY,
      pass_number VARCHAR(50) NOT NULL UNIQUE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      late_date DATE NOT NULL DEFAULT CURRENT_DATE,
      arrival_time VARCHAR(20) NOT NULL,
      reason TEXT NOT NULL,
      remarks TEXT,
      student_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_by_name VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_late_passes_date
      ON student_late_passes (late_date DESC, student_id);
    CREATE INDEX IF NOT EXISTS idx_late_passes_student
      ON student_late_passes (student_id, late_date DESC);

    CREATE TABLE IF NOT EXISTS student_interactions (
      id SERIAL PRIMARY KEY,
      interaction_type VARCHAR(40) NOT NULL CHECK (
        interaction_type IN (
          'query',
          'call',
          'principal_meet',
          'parent_counselling',
          'student_counselling'
        )
      ),
      student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
      student_name VARCHAR(200),
      interaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
      subject VARCHAR(200) NOT NULL,
      description TEXT,
      follow_up_date DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
      academic_year VARCHAR(20),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_by_name VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_student_interactions_type
      ON student_interactions (interaction_type, interaction_date DESC);
    CREATE INDEX IF NOT EXISTS idx_student_interactions_status
      ON student_interactions (status, follow_up_date);
  `);

  await db.query(`
    ALTER TABLE student_registrations
      ADD COLUMN IF NOT EXISTS student_email VARCHAR(200),
      ADD COLUMN IF NOT EXISTS aadhaar_no VARCHAR(20),
      ADD COLUMN IF NOT EXISTS social_category VARCHAR(80),
      ADD COLUMN IF NOT EXISTS religion VARCHAR(100),
      ADD COLUMN IF NOT EXISTS nationality VARCHAR(100),
      ADD COLUMN IF NOT EXISTS father_qualification VARCHAR(255),
      ADD COLUMN IF NOT EXISTS father_occupation VARCHAR(255),
      ADD COLUMN IF NOT EXISTS father_office_address TEXT,
      ADD COLUMN IF NOT EXISTS father_aadhaar VARCHAR(20),
      ADD COLUMN IF NOT EXISTS father_age INTEGER,
      ADD COLUMN IF NOT EXISTS father_annual_income NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS mother_name VARCHAR(200),
      ADD COLUMN IF NOT EXISTS mother_phone VARCHAR(30),
      ADD COLUMN IF NOT EXISTS mother_email VARCHAR(200),
      ADD COLUMN IF NOT EXISTS mother_qualification VARCHAR(255),
      ADD COLUMN IF NOT EXISTS mother_occupation VARCHAR(255),
      ADD COLUMN IF NOT EXISTS mother_office_address TEXT,
      ADD COLUMN IF NOT EXISTS mother_aadhaar VARCHAR(20),
      ADD COLUMN IF NOT EXISTS mother_age INTEGER,
      ADD COLUMN IF NOT EXISTS mother_annual_income NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(200),
      ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(30),
      ADD COLUMN IF NOT EXISTS guardian_email VARCHAR(200),
      ADD COLUMN IF NOT EXISTS guardian_address TEXT,
      ADD COLUMN IF NOT EXISTS guardian_relation VARCHAR(80),
      ADD COLUMN IF NOT EXISTS guardian_marital_status VARCHAR(20),
      ADD COLUMN IF NOT EXISTS guardian_link_staff VARCHAR(200),
      ADD COLUMN IF NOT EXISTS fee_type VARCHAR(120),
      ADD COLUMN IF NOT EXISTS reporting_mobile VARCHAR(30),
      ADD COLUMN IF NOT EXISTS live_class VARCHAR(10) DEFAULT 'Y',
      ADD COLUMN IF NOT EXISTS permanent_address TEXT,
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS pincode VARCHAR(20),
      ADD COLUMN IF NOT EXISTS location VARCHAR(150),
      ADD COLUMN IF NOT EXISTS samagra_id VARCHAR(80),
      ADD COLUMN IF NOT EXISTS student_category VARCHAR(80),
      ADD COLUMN IF NOT EXISTS category VARCHAR(80),
      ADD COLUMN IF NOT EXISTS sub_caste VARCHAR(80),
      ADD COLUMN IF NOT EXISTS fees_from VARCHAR(20),
      ADD COLUMN IF NOT EXISTS last_school VARCHAR(255),
      ADD COLUMN IF NOT EXISTS last_class VARCHAR(80),
      ADD COLUMN IF NOT EXISTS last_division VARCHAR(80),
      ADD COLUMN IF NOT EXISTS year_of_passing VARCHAR(20),
      ADD COLUMN IF NOT EXISTS board_university VARCHAR(255),
      ADD COLUMN IF NOT EXISTS school_transport BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS bus_no VARCHAR(40),
      ADD COLUMN IF NOT EXISTS transport_shift VARCHAR(40),
      ADD COLUMN IF NOT EXISTS bank_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS account_no VARCHAR(40),
      ADD COLUMN IF NOT EXISTS branch VARCHAR(150),
      ADD COLUMN IF NOT EXISTS saturday_activity VARCHAR(100),
      ADD COLUMN IF NOT EXISTS handicapped BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS handicapped_percent NUMERIC(6,2),
      ADD COLUMN IF NOT EXISTS blood_group VARCHAR(20),
      ADD COLUMN IF NOT EXISTS height_cm NUMERIC(6,2),
      ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6,2),
      ADD COLUMN IF NOT EXISTS ration_card BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS ration_type VARCHAR(80),
      ADD COLUMN IF NOT EXISTS ration_no VARCHAR(80),
      ADD COLUMN IF NOT EXISTS medium VARCHAR(40),
      ADD COLUMN IF NOT EXISTS local_address TEXT,
      ADD COLUMN IF NOT EXISTS legal_address TEXT,
      ADD COLUMN IF NOT EXISTS husband_address TEXT,
      ADD COLUMN IF NOT EXISTS reference_contacts JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS exam_subjects JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS previous_education JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS session_rows JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
  `);
}
