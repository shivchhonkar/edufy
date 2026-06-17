-- Phase 3: student_documents — upload & track admission documents

CREATE TABLE IF NOT EXISTS student_documents (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'birth_certificate',
        'aadhaar_card',
        'transfer_certificate',
        'migration_certificate',
        'marksheet',
        'income_certificate',
        'caste_certificate',
        'passport_photo',
        'medical_certificate',
        'report_card'
    )),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    remarks TEXT,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_documents_student_id
  ON student_documents (student_id);

CREATE INDEX IF NOT EXISTS idx_student_documents_type
  ON student_documents (student_id, document_type);
