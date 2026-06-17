-- Phase 16: School houses (sports / house system) and student assignment

CREATE TABLE IF NOT EXISTS school_houses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    color VARCHAR(20) NOT NULL DEFAULT '#2563eb',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_school_houses_name_unique
    ON school_houses (LOWER(TRIM(name)));

CREATE INDEX IF NOT EXISTS idx_student_enrollments_house_id
    ON student_enrollments (house_id)
    WHERE house_id IS NOT NULL;

DO $$
BEGIN
    ALTER TABLE student_enrollments
        ADD CONSTRAINT fk_student_enrollments_house
        FOREIGN KEY (house_id) REFERENCES school_houses(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
