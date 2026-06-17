-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    school_name VARCHAR(255),
    school_address TEXT,
    school_phone VARCHAR(20),
    school_email VARCHAR(255),
    academic_year VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'INR',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    late_fee_percentage DECIMAL(5, 2) DEFAULT 2.00,
    late_fee_days INTEGER DEFAULT 7,
    auto_assign_fees BOOLEAN DEFAULT true,
    send_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings if none exist
INSERT INTO system_settings (
    school_name,
    school_address,
    school_phone,
    school_email,
    currency,
    late_fee_percentage,
    late_fee_days,
    auto_assign_fees,
    send_notifications
)
SELECT 
    'EduLakhya School',
    '',
    '',
    '',
    'INR',
    2.00,
    7,
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM system_settings LIMIT 1);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_system_settings_academic_year ON system_settings(academic_year);




