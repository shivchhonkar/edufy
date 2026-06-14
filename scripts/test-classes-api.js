const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/super-admin/.env.local') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: 'edulakhya_gla',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'shiv',
});

const CLASSES_QUERY_WITH_JUNCTION = `
  SELECT c.*,
    COALESCE(sc.section_count, 0)::int AS section_count,
    COALESCE(st.student_count, 0)::int AS student_count
  FROM classes c
  LEFT JOIN (
    SELECT class_id, COUNT(DISTINCT section_id)::int AS section_count
    FROM (
      SELECT class_id, id AS section_id FROM sections WHERE class_id IS NOT NULL
      UNION
      SELECT class_id, section_id FROM class_sections
    ) combined
    GROUP BY class_id
  ) sc ON sc.class_id = c.id
  LEFT JOIN (
    SELECT class_id, COUNT(*)::int AS student_count
    FROM students
    WHERE class_id IS NOT NULL
    GROUP BY class_id
  ) st ON st.class_id = c.id
`;

async function main() {
  const classes = await pool.query('SELECT id, name FROM classes ORDER BY name');
  console.log('All classes:', classes.rows);

  const activeOnly = true;
  let queryText = `${CLASSES_QUERY_WITH_JUNCTION} WHERE 1=1`;
  if (activeOnly) queryText += ' AND COALESCE(c.is_active, true) = true';
  queryText += ' ORDER BY c.name ASC';

  try {
    const r = await pool.query(queryText);
    console.log('active_only query ok:', r.rows.length);
  } catch (e) {
    console.log('active_only query failed:', e.message);
    if (activeOnly && e.message.includes('is_active')) {
      const r2 = await pool.query(`${CLASSES_QUERY_WITH_JUNCTION} ORDER BY c.name ASC`);
      console.log('fallback ok:', r2.rows.length, r2.rows);
    }
  }

  await pool.end();
}

main().catch(console.error);
