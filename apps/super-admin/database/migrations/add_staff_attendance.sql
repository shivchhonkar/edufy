-- Staff Attendance Management Schema
-- This migration adds comprehensive staff attendance tracking with punch machine integration

-- Staff Attendance Records
CREATE TABLE IF NOT EXISTS staff_attendance (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    break_start_time TIME,
    break_end_time TIME,
    total_hours_worked DECIMAL(4,2),
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
    attendance_type VARCHAR(20) DEFAULT 'manual' CHECK (attendance_type IN ('manual', 'punch_machine', 'biometric', 'mobile_app')),
    device_id VARCHAR(50), -- For punch machine integration
    location VARCHAR(100), -- GPS or device location
    remarks TEXT,
    created_by INTEGER REFERENCES staff(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, attendance_date)
);

-- Punch Machine Devices
CREATE TABLE IF NOT EXISTS punch_machines (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) DEFAULT 'fingerprint' CHECK (device_type IN ('fingerprint', 'rfid', 'face_recognition', 'card_reader')),
    ip_address INET,
    port INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Punch Machine Logs (Raw data from machines)
CREATE TABLE IF NOT EXISTS punch_machine_logs (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) REFERENCES punch_machines(device_id),
    staff_id INTEGER REFERENCES staff(id),
    punch_time TIMESTAMP NOT NULL,
    punch_type VARCHAR(20) CHECK (punch_type IN ('check_in', 'check_out', 'break_start', 'break_end')),
    raw_data JSONB, -- Store raw response from punch machine
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    max_days_per_year INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff Leave Applications
CREATE TABLE IF NOT EXISTS staff_leaves (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    leave_type_id INTEGER REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by INTEGER REFERENCES staff(id),
    approved_at TIMESTAMP,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Policies
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

-- Insert default leave types
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

-- Insert default attendance policy
INSERT INTO attendance_policies (policy_name, work_start_time, work_end_time, break_duration_minutes, late_tolerance_minutes) VALUES
    ('Standard Policy', '09:00:00', '17:00:00', 60, 15)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date ON staff_attendance(staff_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_punch_logs_device_time ON punch_machine_logs(device_id, punch_time);
CREATE INDEX IF NOT EXISTS idx_punch_logs_staff_time ON punch_machine_logs(staff_id, punch_time);
CREATE INDEX IF NOT EXISTS idx_staff_leaves_staff_status ON staff_leaves(staff_id, status);

-- Function to calculate working hours
CREATE OR REPLACE FUNCTION calculate_working_hours(
    check_in TIME,
    check_out TIME,
    break_start TIME DEFAULT NULL,
    break_end TIME DEFAULT NULL
) RETURNS DECIMAL(4,2) AS $$
DECLARE
    total_minutes INTEGER;
    break_minutes INTEGER := 0;
BEGIN
    IF check_in IS NULL OR check_out IS NULL THEN
        RETURN 0;
    END IF;
    
    total_minutes := EXTRACT(EPOCH FROM (check_out - check_in)) / 60;
    
    IF break_start IS NOT NULL AND break_end IS NOT NULL THEN
        break_minutes := EXTRACT(EPOCH FROM (break_end - break_start)) / 60;
    END IF;
    
    RETURN ROUND((total_minutes - break_minutes) / 60.0, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update working hours
CREATE OR REPLACE FUNCTION update_attendance_hours() RETURNS TRIGGER AS $$
BEGIN
    NEW.total_hours_worked := calculate_working_hours(
        NEW.check_in_time,
        NEW.check_out_time,
        NEW.break_start_time,
        NEW.break_end_time
    );
    
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate working hours
CREATE TRIGGER trigger_update_attendance_hours
    BEFORE UPDATE ON staff_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_attendance_hours();








