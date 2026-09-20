import type { RequestDb } from '@/lib/request-db';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS class_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  report_card_format INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_categories_name_lower
  ON class_categories (LOWER(name));

CREATE TABLE IF NOT EXISTS class_category_classes (
  category_id INTEGER NOT NULL REFERENCES class_categories(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id, class_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_category_classes_class
  ON class_category_classes (class_id);
`;

export async function ensureClassCategoriesSchema(db: RequestDb): Promise<void> {
  await db.query(SCHEMA_SQL);
}

export function parseClassIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<number>();
  for (const item of value) {
    const n = Number(item);
    if (Number.isInteger(n) && n > 0) ids.add(n);
  }
  return [...ids];
}

export async function replaceCategoryClasses(
  db: RequestDb,
  categoryId: number,
  classIds: number[],
): Promise<void> {
  await db.query(`DELETE FROM class_category_classes WHERE category_id = $1`, [categoryId]);
  if (classIds.length === 0) return;
  await db.query(`DELETE FROM class_category_classes WHERE class_id = ANY($1::int[])`, [classIds]);
  await db.query(
    `INSERT INTO class_category_classes (category_id, class_id)
     SELECT $1, unnest($2::int[])`,
    [categoryId, classIds],
  );
}

export const CLASS_CATEGORY_LIST_SQL = `
  SELECT cat.*,
    COUNT(c.id)::int AS class_count,
    COALESCE(
      json_agg(
        json_build_object('id', c.id, 'name', c.name)
        ORDER BY c.name
      ) FILTER (WHERE c.id IS NOT NULL),
      '[]'::json
    ) AS classes
  FROM class_categories cat
  LEFT JOIN class_category_classes cc ON cc.category_id = cat.id
  LEFT JOIN classes c ON c.id = cc.class_id
`;
