-- Enquiry Master fields on admission_inquiries (father/mother, extra students, siblings)

ALTER TABLE admission_inquiries
  ADD COLUMN IF NOT EXISTS inquiry_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS enquiry_serial INTEGER,
  ADD COLUMN IF NOT EXISTS number_of_students INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS student_type VARCHAR(30) DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS student_title VARCHAR(20) DEFAULT 'Mst.',
  ADD COLUMN IF NOT EXISTS student_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_school VARCHAR(255),
  ADD COLUMN IF NOT EXISTS father_qualification VARCHAR(255),
  ADD COLUMN IF NOT EXISTS father_occupation VARCHAR(255),
  ADD COLUMN IF NOT EXISTS father_office_address TEXT,
  ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mother_phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS mother_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mother_qualification VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mother_occupation VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mother_office_address TEXT,
  ADD COLUMN IF NOT EXISTS location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reporting VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reporting_mobile VARCHAR(30),
  ADD COLUMN IF NOT EXISTS additional_students JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS siblings JSONB DEFAULT '[]'::jsonb;

UPDATE admission_inquiries
SET inquiry_date = COALESCE(inquiry_date, created_at::date, CURRENT_DATE)
WHERE inquiry_date IS NULL;
