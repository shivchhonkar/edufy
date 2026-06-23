-- Enhanced Fee Management Schema
-- This migration adds support for comprehensive fee management including
-- late fees, discounts, transport fees, and student fee records

-- Student Fee Records (tracks what fees are applicable to each student)
CREATE TABLE IF NOT EXISTS student_fees (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id INTEGER REFERENCES fee_structures(id),
    academic_year VARCHAR(20) NOT NULL,
    amount_due DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    late_fee_amount DECIMAL(10, 2) DEFAULT 0,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'waived')),
    month INTEGER CHECK (month BETWEEN 1 AND 12),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, fee_structure_id, academic_year, month)
);

-- Fee Categories (to organize different types of fees)
CREATE TABLE IF NOT EXISTS fee_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default fee categories
INSERT INTO fee_categories (name, description) VALUES
    ('Tuition Fee', 'Regular tuition fees for academic instruction'),
    ('Transport Fee', 'Bus or van transportation charges'),
    ('Library Fee', 'Library maintenance and book lending charges'),
    ('Laboratory Fee', 'Science lab and computer lab charges'),
    ('Sports Fee', 'Sports facilities and equipment charges'),
    ('Examination Fee', 'Exam paper and evaluation charges'),
    ('Registration Fee', 'New student registration and admission charges'),
    ('Activity Fee', 'Extra-curricular activities charges'),
    ('Late Fee', 'Penalty for late payment'),
    ('Other Charges', 'Miscellaneous charges')
ON CONFLICT (name) DO NOTHING;

-- Update fee_structures table to link with categories
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES fee_categories(id);
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS late_fee_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS late_fee_days INTEGER DEFAULT 7;

-- Fee Discounts table
CREATE TABLE IF NOT EXISTS fee_discounts (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id INTEGER REFERENCES fee_structures(id),
    discount_type VARCHAR(50) CHECK (discount_type IN ('percentage', 'fixed', 'scholarship', 'sibling', 'merit', 'other')),
    discount_value DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    valid_from DATE NOT NULL,
    valid_until DATE,
    approved_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update fee_payments table to add more fields
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS student_fee_id INTEGER REFERENCES student_fees(id);
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS discount_applied DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS late_fee_charged DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS month INTEGER CHECK (month BETWEEN 1 AND 12);
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);

-- Link student_transport with fees
ALTER TABLE student_transport ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10, 2);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_fees_student ON student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_status ON student_fees(status);
CREATE INDEX IF NOT EXISTS idx_student_fees_due_date ON student_fees(due_date);
CREATE INDEX IF NOT EXISTS idx_fee_discounts_student ON fee_discounts(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_category ON fee_structures(category_id);

-- Function to calculate late fees
CREATE OR REPLACE FUNCTION calculate_late_fee(
    p_student_fee_id INTEGER
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_due_date DATE;
    v_amount_due DECIMAL(10, 2);
    v_amount_paid DECIMAL(10, 2);
    v_late_fee_percentage DECIMAL(5, 2);
    v_late_fee_days INTEGER;
    v_days_overdue INTEGER;
    v_late_fee DECIMAL(10, 2);
BEGIN
    -- Get student fee details
    SELECT sf.due_date, sf.amount_due, sf.amount_paid, 
           COALESCE(fs.late_fee_percentage, 0), 
           COALESCE(fs.late_fee_days, 7)
    INTO v_due_date, v_amount_due, v_amount_paid, v_late_fee_percentage, v_late_fee_days
    FROM student_fees sf
    LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
    WHERE sf.id = p_student_fee_id;
    
    -- Calculate days overdue
    v_days_overdue := CURRENT_DATE - v_due_date;
    
    -- If not overdue or fully paid, return 0
    IF v_days_overdue <= v_late_fee_days OR v_amount_paid >= v_amount_due THEN
        RETURN 0;
    END IF;
    
    -- Calculate late fee
    v_late_fee := (v_amount_due - v_amount_paid) * v_late_fee_percentage / 100;
    
    RETURN v_late_fee;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update student_fees status
CREATE OR REPLACE FUNCTION update_student_fee_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update status based on payment
    IF NEW.amount_paid >= NEW.amount_due THEN
        NEW.status := 'paid';
    ELSIF NEW.amount_paid > 0 THEN
        NEW.status := 'partial';
    ELSIF CURRENT_DATE > NEW.due_date THEN
        NEW.status := 'overdue';
    ELSE
        NEW.status := 'pending';
    END IF;
    
    NEW.updated_at := CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_student_fee_status
    BEFORE INSERT OR UPDATE ON student_fees
    FOR EACH ROW
    EXECUTE FUNCTION update_student_fee_status();

