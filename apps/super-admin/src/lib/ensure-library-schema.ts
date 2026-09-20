import type { RequestDb } from '@/lib/request-db';

export async function ensureLibrarySchema(db: RequestDb) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS library_authors (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      remarks TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS library_publishers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      remarks TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS library_subjects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      remarks TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS library_vendors (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      contact_person VARCHAR(150),
      phone VARCHAR(30),
      email VARCHAR(150),
      address TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS library_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS library_fine_rules (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      borrower_type VARCHAR(20) NOT NULL DEFAULT 'all',
      days_allowed INTEGER NOT NULL DEFAULT 14,
      fine_per_day DECIMAL(10,2) NOT NULL DEFAULT 10,
      max_fine DECIMAL(10,2),
      grace_days INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS library_books (
      id SERIAL PRIMARY KEY,
      title VARCHAR(300) NOT NULL,
      isbn VARCHAR(40),
      author_id INTEGER REFERENCES library_authors(id) ON DELETE SET NULL,
      publisher_id INTEGER REFERENCES library_publishers(id) ON DELETE SET NULL,
      vendor_id INTEGER REFERENCES library_vendors(id) ON DELETE SET NULL,
      subject_id INTEGER REFERENCES library_subjects(id) ON DELETE SET NULL,
      category_id INTEGER REFERENCES library_categories(id) ON DELETE SET NULL,
      author VARCHAR(200),
      publisher VARCHAR(200),
      author2 VARCHAR(200),
      publish_year INTEGER,
      description TEXT,
      remarks TEXT,
      price DECIMAL(10,2),
      language VARCHAR(50),
      edition VARCHAR(50),
      pages INTEGER,
      accession_prefix VARCHAR(40),
      accession_no VARCHAR(80),
      purchase_date DATE,
      location VARCHAR(150),
      class_no VARCHAR(80),
      binding VARCHAR(80),
      is_reference BOOLEAN NOT NULL DEFAULT false,
      book_type VARCHAR(80),
      volume VARCHAR(50),
      bill_no VARCHAR(80),
      with_cd BOOLEAN NOT NULL DEFAULT false,
      accession_date DATE,
      book_status VARCHAR(40) NOT NULL DEFAULT 'On Shelf',
      total_copies INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS library_copies (
      id SERIAL PRIMARY KEY,
      book_id INTEGER NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
      barcode VARCHAR(80) NOT NULL,
      accession_no VARCHAR(80),
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS library_members (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      card_number VARCHAR(40),
      email VARCHAR(150),
      phone VARCHAR(30),
      address TEXT,
      date_of_birth DATE,
      membership_date DATE,
      member_type VARCHAR(20) DEFAULT 'student',
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS library_issues (
      id SERIAL PRIMARY KEY,
      copy_id INTEGER NOT NULL REFERENCES library_copies(id) ON DELETE RESTRICT,
      book_id INTEGER NOT NULL REFERENCES library_books(id) ON DELETE RESTRICT,
      borrower_type VARCHAR(20) NOT NULL DEFAULT 'student',
      student_id INTEGER,
      staff_id INTEGER,
      member_id INTEGER,
      issued_at DATE NOT NULL,
      due_at DATE NOT NULL,
      returned_at DATE,
      fine_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      remarks TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'issued',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_library_copies_barcode ON library_copies(barcode);
    CREATE INDEX IF NOT EXISTS idx_library_copies_book ON library_copies(book_id);
    CREATE INDEX IF NOT EXISTS idx_library_copies_status ON library_copies(status);
    CREATE INDEX IF NOT EXISTS idx_library_issues_status ON library_issues(status, due_at);
    CREATE INDEX IF NOT EXISTS idx_library_issues_borrower ON library_issues(borrower_type, student_id, staff_id);
    CREATE INDEX IF NOT EXISTS idx_library_books_title ON library_books(title);

    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS author2 VARCHAR(200);
    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS remarks TEXT;
    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS pages INTEGER;
    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS accession_prefix VARCHAR(40);
    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS accession_no VARCHAR(80);
    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS purchase_date DATE;
    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS location VARCHAR(150);
    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS class_no VARCHAR(80);
    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS binding VARCHAR(80);
    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS is_reference BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS book_type VARCHAR(80);
    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS volume VARCHAR(50);
    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS bill_no VARCHAR(80);
    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS with_cd BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS accession_date DATE;
    ALTER TABLE library_books ADD COLUMN IF NOT EXISTS book_status VARCHAR(40) DEFAULT 'On Shelf';
  `);

  const existing = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM library_fine_rules`
  );
  if (parseInt(existing.rows[0]?.count || '0', 10) === 0) {
    await db.query(
      `INSERT INTO library_fine_rules (name, borrower_type, days_allowed, fine_per_day, grace_days)
       VALUES
         ('Student default', 'student', 14, 10, 0),
         ('Staff default', 'staff', 21, 5, 0)`
    );
  }
}
