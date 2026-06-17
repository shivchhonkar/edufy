-- EduLakhya School CRM Database Schema

-- Users and Authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'teacher', 'student', 'parent', 'transport_manager', 'inventory_manager')),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students Table
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    student_code VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_group VARCHAR(5),
    aadhaar_no VARCHAR(20),
    religion VARCHAR(100),
    caste VARCHAR(100),
    category VARCHAR(50),
    nationality VARCHAR(100),
    mother_tongue VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    admission_date DATE NOT NULL,
    class_id INTEGER,
    section_id INTEGER,
    roll_number VARCHAR(20),
    parent_name VARCHAR(255),
    parent_phone VARCHAR(20),
    parent_email VARCHAR(255),
    emergency_contact VARCHAR(20),
    photo_url TEXT,
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'transferred')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_students_student_code ON students (student_code)
  WHERE student_code IS NOT NULL AND student_code <> '';

-- Student guardians (father / mother / guardian)
CREATE TABLE student_guardians (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    relation_type VARCHAR(20) NOT NULL CHECK (relation_type IN ('father', 'mother', 'guardian')),
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20),
    alternate_mobile VARCHAR(20),
    email VARCHAR(255),
    occupation VARCHAR(100),
    annual_income DECIMAL(12, 2),
    company_name VARCHAR(255),
    aadhaar_no VARCHAR(20),
    photo TEXT,
    is_primary_contact BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_guardians_student_id ON student_guardians (student_id);

-- Student documents
CREATE TABLE student_documents (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'birth_certificate', 'aadhaar_card', 'transfer_certificate',
        'migration_certificate', 'marksheet', 'income_certificate',
        'caste_certificate', 'passport_photo', 'medical_certificate', 'report_card'
    )),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    remarks TEXT,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_documents_student_id ON student_documents (student_id);

-- Student medical records (one per student)
CREATE TABLE student_medical_records (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    blood_group VARCHAR(10),
    allergies TEXT,
    chronic_disease TEXT,
    disability TEXT,
    doctor_name VARCHAR(255),
    doctor_contact VARCHAR(20),
    emergency_contact VARCHAR(20),
    medical_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classes Table
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    academic_year VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sections Table (master records — assign to classes via class_sections)
CREATE TABLE sections (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    name VARCHAR(50) NOT NULL,
    capacity INTEGER,
    class_teacher_id INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE class_sections (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (class_id, section_id)
);

CREATE INDEX idx_class_sections_class ON class_sections (class_id);
CREATE INDEX idx_class_sections_section ON class_sections (section_id);

-- Student enrollments (session-wise class history)
CREATE TABLE student_enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    academic_year_id INTEGER,
    academic_year VARCHAR(20) NOT NULL,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
    roll_number VARCHAR(50),
    stream_id INTEGER,
    house_id INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'promoted', 'repeated', 'transferred', 'left')),
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_enrollments_student_id ON student_enrollments (student_id);
CREATE UNIQUE INDEX idx_student_enrollments_one_current_per_student
  ON student_enrollments (student_id) WHERE is_current = true;
CREATE INDEX idx_student_enrollments_current ON student_enrollments (student_id, is_current) WHERE is_current = true;

-- Student Fees Table
CREATE TABLE fee_structures (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id),
    fee_type VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    frequency VARCHAR(20) CHECK (frequency IN ('monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time')),
    academic_year VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fee_payments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id INTEGER REFERENCES fee_structures(id),
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'online', 'cheque', 'card')),
    transaction_id VARCHAR(100),
    receipt_number VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    remarks TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Table
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
    remarks TEXT,
    marked_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, date)
);

-- Holidays Table
CREATE TABLE holidays (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('public', 'school', 'national', 'festival')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Homework/Assignments Table
CREATE TABLE homework (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id),
    section_id INTEGER REFERENCES sections(id),
    subject_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_marks INTEGER,
    assigned_by INTEGER REFERENCES users(id),
    attachment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE homework_submissions (
    id SERIAL PRIMARY KEY,
    homework_id INTEGER REFERENCES homework(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    submission_date TIMESTAMP,
    submission_url TEXT,
    marks_obtained INTEGER,
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded', 'late')),
    graded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subjects Table
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exams and Results
CREATE TABLE exams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    exam_type VARCHAR(50) CHECK (exam_type IN ('unit_test', 'mid_term', 'final', 'practical', 'other')),
    class_id INTEGER REFERENCES classes(id),
    academic_year VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_marks INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exam_subjects (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id),
    exam_date DATE,
    max_marks INTEGER NOT NULL,
    pass_marks INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE results (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    exam_subject_id INTEGER REFERENCES exam_subjects(id),
    marks_obtained DECIMAL(5, 2),
    grade VARCHAR(5),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, exam_subject_id)
);

-- Staff Management
CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_group VARCHAR(5),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    emergency_contact VARCHAR(20),
    designation VARCHAR(100),
    last_designation VARCHAR(100),
    department VARCHAR(100),
    qualification TEXT,
    experience_years INTEGER,
    date_of_joining DATE NOT NULL,
    employment_type VARCHAR(50) CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary')),
    salary DECIMAL(10, 2),
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),
    bank_ifsc VARCHAR(20),
    photo_url TEXT,
    documents JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resigned', 'terminated')),
    notes TEXT,
    status_change_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff Attendance
CREATE TABLE staff_attendance (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    status VARCHAR(20) CHECK (status IN ('present', 'absent', 'half_day', 'on_leave', 'holiday')),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, date)
);

-- Staff Leave Management
CREATE TABLE staff_leaves (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) CHECK (leave_type IN ('casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by INTEGER REFERENCES users(id),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payroll
CREATE TABLE payroll (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    basic_salary DECIMAL(10, 2) NOT NULL,
    allowances DECIMAL(10, 2) DEFAULT 0,
    deductions DECIMAL(10, 2) DEFAULT 0,
    net_salary DECIMAL(10, 2) NOT NULL,
    payment_date DATE,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid')),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, month, year)
);

-- Performance Reviews
CREATE TABLE performance_reviews (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    review_period VARCHAR(100),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    strengths TEXT,
    areas_of_improvement TEXT,
    goals TEXT,
    reviewer_id INTEGER REFERENCES users(id),
    review_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transport Management
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50) CHECK (vehicle_type IN ('bus', 'van', 'car')),
    model VARCHAR(100),
    capacity INTEGER NOT NULL,
    registration_date DATE,
    insurance_expiry DATE,
    pollution_certificate_expiry DATE,
    fitness_certificate_expiry DATE,
    owner_name VARCHAR(255),
    owner_phone VARCHAR(20),
    driver_name VARCHAR(255),
    driver_phone VARCHAR(20),
    driver_license VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    license_expiry DATE NOT NULL,
    address TEXT,
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    route_number VARCHAR(50) UNIQUE,
    starting_point VARCHAR(255),
    ending_point VARCHAR(255),
    total_distance DECIMAL(10, 2),
    estimated_time INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE route_stops (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
    stop_name VARCHAR(255) NOT NULL,
    stop_order INTEGER NOT NULL,
    arrival_time TIME,
    pickup_fee DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicle_assignments (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id),
    driver_id INTEGER REFERENCES drivers(id),
    route_id INTEGER REFERENCES routes(id),
    assigned_date DATE NOT NULL,
    shift VARCHAR(20) CHECK (shift IN ('morning', 'afternoon', 'both')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_transport (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    route_id INTEGER REFERENCES routes(id),
    stop_id INTEGER REFERENCES route_stops(id),
    transport_fee DECIMAL(10, 2),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Management
CREATE TABLE inventory_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES inventory_categories(id),
    item_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(50) UNIQUE,
    description TEXT,
    unit VARCHAR(50),
    quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER,
    unit_price DECIMAL(10, 2),
    supplier_name VARCHAR(255),
    supplier_contact VARCHAR(100),
    location VARCHAR(255),
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_transactions (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES inventory_items(id),
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('purchase', 'issue', 'return', 'damage', 'adjustment')),
    quantity INTEGER NOT NULL,
    transaction_date DATE NOT NULL,
    issued_to_type VARCHAR(50),
    issued_to_id INTEGER,
    unit_price DECIMAL(10, 2),
    total_amount DECIMAL(10, 2),
    remarks TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_inventory (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES inventory_items(id),
    quantity INTEGER NOT NULL,
    issue_date DATE NOT NULL,
    return_date DATE,
    amount_charged DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'lost', 'damaged')),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Announcements
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_audience VARCHAR(50) CHECK (target_audience IN ('all', 'students', 'parents', 'staff', 'teachers')),
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high')),
    start_date DATE,
    end_date DATE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS campaigns (2factor.in)
CREATE TABLE sms_campaigns (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sms_type VARCHAR(20) DEFAULT 'transactional'
        CHECK (sms_type IN ('transactional', 'promotional')),
    audience_type VARCHAR(50) NOT NULL,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed'
        CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sms_message_logs (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_name VARCHAR(255),
    student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed')),
    provider_response TEXT,
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sms_campaigns_created_at ON sms_campaigns (created_at DESC);
CREATE INDEX idx_sms_message_logs_campaign_id ON sms_message_logs (campaign_id);

-- Create indexes for better performance
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_admission ON students(admission_number);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_staff_employee_id ON staff(employee_id);
CREATE INDEX idx_staff_status ON staff(status);
CREATE INDEX idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX idx_results_student ON results(student_id);
CREATE INDEX idx_results_exam ON results(exam_id);
CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
