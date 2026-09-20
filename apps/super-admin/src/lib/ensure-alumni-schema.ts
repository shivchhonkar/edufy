import type { RequestDb } from '@/lib/request-db';

export async function ensureAlumniSchema(db: RequestDb): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS alumni_profiles (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
      batch_year VARCHAR(20),
      last_class VARCHAR(100),
      last_section VARCHAR(100),
      exit_date DATE,
      exit_reason VARCHAR(120),
      current_email VARCHAR(255),
      current_phone VARCHAR(20),
      current_address TEXT,
      current_city VARCHAR(100),
      linkedin_url TEXT,
      is_public BOOLEAN DEFAULT true,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_alumni_profiles_student ON alumni_profiles (student_id);
    CREATE INDEX IF NOT EXISTS idx_alumni_profiles_batch ON alumni_profiles (batch_year);

    CREATE TABLE IF NOT EXISTS alumni_higher_education (
      id SERIAL PRIMARY KEY,
      alumni_id INTEGER NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      institution_name VARCHAR(255) NOT NULL,
      degree VARCHAR(120),
      field_of_study VARCHAR(150),
      start_year INTEGER,
      end_year INTEGER,
      status VARCHAR(30) DEFAULT 'studying' CHECK (status IN ('studying', 'completed', 'dropped')),
      country VARCHAR(100),
      city VARCHAR(100),
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_alumni_higher_ed_student ON alumni_higher_education (student_id);

    CREATE TABLE IF NOT EXISTS alumni_employment (
      id SERIAL PRIMARY KEY,
      alumni_id INTEGER NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      company_name VARCHAR(255) NOT NULL,
      job_title VARCHAR(150),
      industry VARCHAR(100),
      employment_type VARCHAR(30) DEFAULT 'full_time'
        CHECK (employment_type IN ('full_time', 'part_time', 'self_employed', 'internship', 'contract')),
      start_date DATE,
      end_date DATE,
      is_current BOOLEAN DEFAULT false,
      location VARCHAR(150),
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_alumni_employment_student ON alumni_employment (student_id);

    CREATE TABLE IF NOT EXISTS alumni_events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      event_date DATE NOT NULL,
      event_time TIME,
      venue VARCHAR(255),
      event_type VARCHAR(50) DEFAULT 'reunion'
        CHECK (event_type IN ('reunion', 'networking', 'workshop', 'fundraiser', 'other')),
      max_attendees INTEGER,
      registration_deadline DATE,
      status VARCHAR(20) DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'completed', 'cancelled')),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_by_name VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_alumni_events_date ON alumni_events (event_date DESC);

    CREATE TABLE IF NOT EXISTS alumni_event_registrations (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES alumni_events(id) ON DELETE CASCADE,
      alumni_id INTEGER NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (event_id, alumni_id)
    );

    CREATE TABLE IF NOT EXISTS alumni_success_stories (
      id SERIAL PRIMARY KEY,
      alumni_id INTEGER NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      story TEXT NOT NULL,
      achievement_summary VARCHAR(500),
      photo_url TEXT,
      is_published BOOLEAN DEFAULT false,
      published_at TIMESTAMP,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_by_name VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_alumni_stories_published ON alumni_success_stories (is_published, created_at DESC);
  `);
}
