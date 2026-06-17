-- Phase 9-14: School setup, timetable, exam terms, payroll runs, accounting

-- Phase 1: School setup wizard progress
CREATE TABLE IF NOT EXISTS school_setup_progress (
    id SERIAL PRIMARY KEY,
    current_step INTEGER DEFAULT 1,
    completed_steps JSONB DEFAULT '[]'::jsonb,
    is_complete BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Phase 3: Exam terms for report cards
CREATE TABLE IF NOT EXISTS exam_terms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE exams ADD COLUMN IF NOT EXISTS term_id INTEGER REFERENCES exam_terms(id) ON DELETE SET NULL;

-- Phase 4: Timetable
CREATE TABLE IF NOT EXISTS timetable_periods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_timetable (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    period_id INTEGER NOT NULL REFERENCES timetable_periods(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    room VARCHAR(50),
    academic_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (class_id, section_id, day_of_week, period_id, academic_year)
);

-- Phase 5: Payroll runs (batch processing)
CREATE TABLE IF NOT EXISTS payroll_runs (
    id SERIAL PRIMARY KEY,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'processed', 'paid')),
    total_amount DECIMAL(12, 2) DEFAULT 0,
    staff_count INTEGER DEFAULT 0,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (month, year)
);

-- Phase 6: Accounting (double-entry)
CREATE TABLE IF NOT EXISTS accounting_accounts (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(30) NOT NULL
        CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
    parent_id INTEGER REFERENCES accounting_accounts(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    reference VARCHAR(100),
    source VARCHAR(50) DEFAULT 'manual',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_lines (
    id SERIAL PRIMARY KEY,
    entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES accounting_accounts(id),
    debit DECIMAL(12, 2) DEFAULT 0 CHECK (debit >= 0),
    credit DECIMAL(12, 2) DEFAULT 0 CHECK (credit >= 0),
    description TEXT,
    CHECK (debit > 0 OR credit > 0)
);

CREATE INDEX IF NOT EXISTS idx_class_timetable_class ON class_timetable (class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines (entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines (account_id);

-- Seed default accounting accounts
INSERT INTO accounting_accounts (code, name, account_type) VALUES
    ('1000', 'Cash', 'asset'),
    ('1100', 'Bank', 'asset'),
    ('2000', 'Accounts Payable', 'liability'),
    ('3000', 'Retained Earnings', 'equity'),
    ('4000', 'Fee Income', 'income'),
    ('4100', 'Other Income', 'income'),
    ('5000', 'Salary Expense', 'expense'),
    ('5100', 'Operating Expense', 'expense')
ON CONFLICT (code) DO NOTHING;

-- Seed default timetable periods (only when table is empty)
INSERT INTO timetable_periods (name, start_time, end_time, sort_order)
SELECT * FROM (VALUES
    ('Period 1'::varchar, '08:00'::time, '08:45'::time, 1),
    ('Period 2', '08:45', '09:30', 2),
    ('Period 3', '09:45', '10:30', 3),
    ('Period 4', '10:30', '11:15', 4),
    ('Period 5', '11:30', '12:15', 5),
    ('Period 6', '12:15', '13:00', 6)
) AS v(name, start_time, end_time, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM timetable_periods LIMIT 1);
