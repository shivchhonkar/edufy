-- Phase 8: admission inquiry CRM (pre-enrollment leads)

CREATE TABLE IF NOT EXISTS admission_inquiries (
    id SERIAL PRIMARY KEY,
    inquiry_number VARCHAR(50) NOT NULL UNIQUE,
    student_first_name VARCHAR(100) NOT NULL,
    student_last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    parent_name VARCHAR(255) NOT NULL,
    parent_phone VARCHAR(20) NOT NULL,
    parent_email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    interested_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    academic_year VARCHAR(20),
    source VARCHAR(50) DEFAULT 'walk_in'
        CHECK (source IN ('walk_in', 'phone', 'website', 'referral', 'social_media', 'other')),
    status VARCHAR(30) DEFAULT 'new'
        CHECK (status IN (
            'new', 'contacted', 'visit_scheduled', 'interested',
            'registered', 'enrolled', 'lost', 'on_hold'
        )),
    priority VARCHAR(20) DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high')),
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    follow_up_date DATE,
    remarks TEXT,
    converted_student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admission_inquiry_activities (
    id SERIAL PRIMARY KEY,
    inquiry_id INTEGER NOT NULL REFERENCES admission_inquiries(id) ON DELETE CASCADE,
    activity_type VARCHAR(30) DEFAULT 'note'
        CHECK (activity_type IN ('note', 'call', 'email', 'visit', 'sms', 'status_change')),
    description TEXT NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admission_inquiries_status ON admission_inquiries (status);
CREATE INDEX IF NOT EXISTS idx_admission_inquiries_follow_up ON admission_inquiries (follow_up_date);
CREATE INDEX IF NOT EXISTS idx_admission_inquiries_phone ON admission_inquiries (parent_phone);
CREATE INDEX IF NOT EXISTS idx_admission_inquiry_activities_inquiry ON admission_inquiry_activities (inquiry_id);
