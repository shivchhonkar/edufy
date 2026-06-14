/**
 * Seed half-yearly + annual exams with sample results for Class 1.
 * Usage: node scripts/seed-class1-marksheet-data.js
 */
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'edu_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'shiv',
});

const MIGRATION_SQL = `
ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_date DATE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS subject_id INTEGER;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS passing_marks INTEGER;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS total_marks INTEGER;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);
ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_exam_type_check;

CREATE TABLE IF NOT EXISTS exam_subjects (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  total_marks INTEGER,
  passing_marks INTEGER,
  max_marks INTEGER,
  pass_marks INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, subject_id)
);

ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS total_marks INTEGER;
ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS passing_marks INTEGER;
ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS max_marks INTEGER;
ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS pass_marks INTEGER;
ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS subject_id INTEGER;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS is_absent BOOLEAN DEFAULT false;

ALTER TABLE exam_results DROP CONSTRAINT IF EXISTS exam_results_exam_id_student_id_key;
ALTER TABLE exam_results DROP CONSTRAINT IF EXISTS unique_exam_student;
DROP INDEX IF EXISTS exam_results_exam_student_subject_idx;
CREATE UNIQUE INDEX IF NOT EXISTS exam_results_exam_student_subject_idx
  ON exam_results (exam_id, student_id, subject_id);

CREATE UNIQUE INDEX IF NOT EXISTS exam_subjects_exam_subject_unique ON exam_subjects(exam_id, subject_id);
`;

const SAMPLE_STUDENTS = [
  { first_name: 'Aryan', last_name: 'Sharma', parent_name: 'Rajeev Sharma', roll_number: '1', dob: '2013-06-15', gender: 'Male' },
  { first_name: 'Priya', last_name: 'Verma', parent_name: 'Sunil Verma', roll_number: '2', dob: '2013-03-22', gender: 'Female' },
  { first_name: 'Kunal', last_name: 'Gupta', parent_name: 'Anil Gupta', roll_number: '3', dob: '2013-11-08', gender: 'Male' },
  { first_name: 'Sneha', last_name: 'Patel', parent_name: 'Mahesh Patel', roll_number: '4', dob: '2013-01-30', gender: 'Female' },
];

function grade(marks, total) {
  const p = total ? (marks / total) * 100 : 0;
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B+';
  if (p >= 60) return 'B';
  if (p >= 50) return 'C';
  if (p >= 40) return 'D';
  return 'F';
}

function sampleMarks(base, spread, index) {
  return Math.min(100, Math.max(35, base + ((index * 7 + spread) % 15) - 5));
}

function dedupeSubjects(rows) {
  const seen = new Set();
  return rows.filter((r) => {
    const key = r.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function ensureSchema(client) {
  await client.query(MIGRATION_SQL);
}

async function findClass1(client) {
  const res = await client.query(
    `SELECT id, name FROM classes
     WHERE name ILIKE 'class 1' OR name = '1' OR name ILIKE 'class%1%'
     ORDER BY CASE WHEN name ILIKE 'class 1' THEN 0 WHEN name = '1' THEN 1 ELSE 2 END, id
     LIMIT 1`
  );
  if (!res.rows.length) throw new Error('Class 1 not found. Create Class 1 first.');
  return res.rows[0];
}

async function getSubjects(client, classId) {
  const classSubjects = await client.query(
    `SELECT s.id, s.name FROM class_subjects cs
     JOIN subjects s ON s.id = cs.subject_id
     WHERE cs.class_id = $1
     ORDER BY s.name`,
    [classId]
  );
  if (classSubjects.rows.length >= 2) return dedupeSubjects(classSubjects.rows).slice(0, 8);

  const all = await client.query(`SELECT id, name FROM subjects ORDER BY name LIMIT 8`);
  if (!all.rows.length) throw new Error('No subjects found. Add subjects in setup first.');
  return dedupeSubjects(all.rows);
}

async function ensureSampleStudents(client, classId) {
  const existing = await client.query(
    `SELECT id, first_name, last_name, admission_number
     FROM students WHERE class_id = $1 AND status = 'active'
     ORDER BY roll_number NULLS LAST, first_name`,
    [classId]
  );
  if (existing.rows.length >= 4) return existing.rows;

  console.log(`Adding sample students (currently ${existing.rows.length} in Class 1)...`);
  const year = new Date().getFullYear();
  for (const s of SAMPLE_STUDENTS) {
    const dup = await client.query(
      `SELECT id FROM students WHERE class_id = $1 AND first_name = $2 AND last_name = $3 LIMIT 1`,
      [classId, s.first_name, s.last_name]
    );
    if (dup.rows.length) continue;

    const adm = `ADM${year}${String(Math.floor(Math.random() * 9000) + 1000)}`;
    await client.query(
      `INSERT INTO students (
        admission_number, first_name, last_name, date_of_birth, gender,
        admission_date, class_id, roll_number, parent_name, status
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8, 'active')`,
      [adm, s.first_name, s.last_name, s.dob, s.gender, classId, s.roll_number, s.parent_name]
    );
    console.log(`  Added ${s.first_name} ${s.last_name} (${adm})`);
  }

  const res = await client.query(
    `SELECT id, first_name, last_name, admission_number
     FROM students WHERE class_id = $1 AND status = 'active'
     ORDER BY roll_number NULLS LAST, first_name`,
    [classId]
  );
  if (!res.rows.length) throw new Error('No active students in Class 1.');
  return res.rows;
}

async function getAcademicYear(client) {
  const res = await client.query(
    `SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1`
  );
  if (res.rows[0]?.academic_year) return res.rows[0].academic_year;
  const y = new Date().getFullYear();
  return `${y}-${String(y + 1).slice(-2)}`;
}

async function findOrCreateExam(client, { name, examType, classId, subjectIds, examDate, academicYear }) {
  const existing = await client.query(
    `SELECT id, name FROM exams WHERE class_id = $1 AND name = $2 LIMIT 1`,
    [classId, name]
  );
  if (existing.rows.length) {
    console.log(`  Exam already exists: "${name}" (id=${existing.rows[0].id}) — updating results`);
    return existing.rows[0].id;
  }

  const totalMarks = 100;
  const passingMarks = 33;
  const ins = await client.query(
    `INSERT INTO exams (
      name, class_id, subject_id, exam_type, exam_date,
      total_marks, passing_marks, academic_year, start_date, end_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $5, $5)
    RETURNING id`,
    [name, classId, subjectIds[0], examType, examDate, totalMarks, passingMarks, academicYear]
  );
  const examId = ins.rows[0].id;

  for (const sid of subjectIds) {
    await client.query(
      `INSERT INTO exam_subjects (exam_id, subject_id, total_marks, passing_marks, max_marks, pass_marks)
       VALUES ($1, $2, $3, $4, $3, $4)
       ON CONFLICT (exam_id, subject_id) DO UPDATE
       SET total_marks = EXCLUDED.total_marks, passing_marks = EXCLUDED.passing_marks,
           max_marks = EXCLUDED.max_marks, pass_marks = EXCLUDED.pass_marks`,
      [examId, sid, totalMarks, passingMarks]
    );
  }

  console.log(`  Created exam: "${name}" (id=${examId}, type=${examType})`);
  return examId;
}

async function uploadResults(client, examId, students, subjectIds, baseOffset) {
  await client.query('DELETE FROM exam_results WHERE exam_id = $1', [examId]);

  let count = 0;
  for (let si = 0; si < students.length; si++) {
    const student = students[si];
    for (let subi = 0; subi < subjectIds.length; subi++) {
      const subjectId = subjectIds[subi];
      const marks = sampleMarks(78 + baseOffset, si * 3 + subi, si + subi);
      const g = grade(marks, 100);
      await client.query(
        `INSERT INTO exam_results (exam_id, student_id, subject_id, marks_obtained, grade, is_absent)
         VALUES ($1, $2, $3, $4, $5, false)`,
        [examId, student.id, subjectId, marks, g]
      );
      count++;
    }
  }
  console.log(`  Uploaded ${count} result rows for exam ${examId}`);
}

async function main() {
  const client = await pool.connect();
  try {
    await ensureSchema(client);

    const classRow = await findClass1(client);
    console.log(`Class: ${classRow.name} (id=${classRow.id})`);

    const subjects = await getSubjects(client, classRow.id);
    const subjectIds = subjects.map((s) => s.id);
    console.log(`Subjects (${subjects.length}): ${subjects.map((s) => s.name).join(', ')}`);

    const students = await ensureSampleStudents(client, classRow.id);
    console.log(`Students (${students.length}): ${students.map((s) => s.first_name + ' ' + s.last_name).join(', ')}`);

    const academicYear = await getAcademicYear(client);
    console.log(`Academic year: ${academicYear}`);

    await client.query('BEGIN');

    const halfYearlyId = await findOrCreateExam(client, {
      name: `Class 1 Half-Yearly ${academicYear}`,
      examType: 'half_yearly',
      classId: classRow.id,
      subjectIds,
      examDate: '2025-10-15',
      academicYear,
    });

    const annualId = await findOrCreateExam(client, {
      name: `Class 1 Annual ${academicYear}`,
      examType: 'annual',
      classId: classRow.id,
      subjectIds,
      examDate: '2026-03-20',
      academicYear,
    });

    await uploadResults(client, halfYearlyId, students, subjectIds, 0);
    await uploadResults(client, annualId, students, subjectIds, 4);

    await client.query('COMMIT');

    console.log('\nDone! Generate marksheet at Report Cards page:');
    console.log(`  Class: ${classRow.name}`);
    console.log(`  Half-Yearly: "Class 1 Half-Yearly ${academicYear}" (id=${halfYearlyId})`);
    console.log(`  Annual: "Class 1 Annual ${academicYear}" (id=${annualId})`);
    console.log(`  Students: ${students.length} | Subjects: ${subjects.length}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
