import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'shiv',
  database: 'Shribi Edufy_global',
});

const tables = await pool.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name IN ('school_notifications', 'school_circulars')`,
);
console.log('tables:', tables.rows);

try {
  const all = await pool.query(
    `SELECT id, title, audience_type, status, published_at, expires_at, created_at
     FROM school_notifications ORDER BY id DESC LIMIT 10`,
  );
  console.log('all notifications:', all.rows);
} catch (e) {
  console.log('school_notifications error:', e.message);
}

const students = await pool.query(
  `SELECT s.id, s.first_name, s.last_name,
          COALESCE(e.class_id, s.class_id) AS class_id,
          COALESCE(e.section_id, s.section_id) AS section_id
   FROM students s
   LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
   WHERE s.first_name ILIKE '%kunal%' OR s.first_name ILIKE '%tannu%'
   LIMIT 5`,
);
console.log('students:', students.rows);

for (const student of students.rows) {
  const classId = student.class_id;
  const sectionId = student.section_id;
  const params = [];
  const parts = [`audience_type IN ('all', 'all_parents')`];
  if (classId != null) {
    params.push(classId);
    parts.push(`(audience_type = 'class_parents' AND class_id = $${params.length})`);
  }
  if (classId != null && sectionId != null) {
    params.push(classId, sectionId);
    parts.push(
      `(audience_type = 'section_parents' AND class_id = $${params.length - 1} AND section_id = $${params.length})`,
    );
  }
  const audienceSql = `(${parts.join(' OR ')})`;
  try {
    const visible = await pool.query(
      `SELECT id, title, status, audience_type FROM school_notifications
       WHERE status = 'active'
         AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)
         AND ${audienceSql}
       ORDER BY COALESCE(published_at, created_at) DESC`,
      params,
    );
    console.log(`visible for ${student.first_name} (class=${classId}, section=${sectionId}):`, visible.rows);
  } catch (e) {
    console.log('query error:', e.message);
  }
}

await pool.end();
