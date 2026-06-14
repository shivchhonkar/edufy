import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import type { PoolClient } from 'pg';

async function resolveAcademicYear(client: PoolClient): Promise<string> {
  const active = await client.query<{ name: string }>(
    'SELECT name FROM academic_years WHERE is_active = true LIMIT 1'
  );
  if (active.rows[0]?.name) return active.rows[0].name;

  const settings = await client.query<{ academic_year: string }>(
    'SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1'
  );
  if (settings.rows[0]?.academic_year) return settings.rows[0].academic_year;

  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
}

async function ensureFeeCategoriesOnly(client: PoolClient) {
  const categoriesResult = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM fee_categories'
  );
  const categoriesCount = parseInt(categoriesResult.rows[0].count, 10);

  if (categoriesCount === 0) {
    await client.query(`
      INSERT INTO fee_categories (name, description) VALUES
      ('Tuition Fee', 'Regular tuition fees for academic instruction'),
      ('Transport Fee', 'Bus or van transportation charges'),
      ('Library Fee', 'Library maintenance and book lending charges'),
      ('Laboratory Fee', 'Science lab and computer lab charges'),
      ('Sports Fee', 'Sports facilities and equipment charges'),
      ('Examination Fee', 'Exam paper and evaluation charges'),
      ('Activity Fee', 'Extra-curricular activities charges'),
      ('Late Fee', 'Penalty for late payment'),
      ('Other Charges', 'Miscellaneous charges')
    `);
  }

  return { categoriesCreated: categoriesCount === 0 };
}

async function initializeFees(client: PoolClient) {
  const academicYear = await resolveAcademicYear(client);
  const currentMonth = new Date().getMonth() + 1;

  const categoriesResult = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM fee_categories'
  );
  const categoriesCount = parseInt(categoriesResult.rows[0].count, 10);

  if (categoriesCount === 0) {
    await client.query(`
      INSERT INTO fee_categories (name, description) VALUES
      ('Tuition Fee', 'Regular tuition fees for academic instruction'),
      ('Transport Fee', 'Bus or van transportation charges'),
      ('Library Fee', 'Library maintenance and book lending charges'),
      ('Laboratory Fee', 'Science lab and computer lab charges'),
      ('Sports Fee', 'Sports facilities and equipment charges'),
      ('Examination Fee', 'Exam paper and evaluation charges'),
      ('Activity Fee', 'Extra-curricular activities charges'),
      ('Late Fee', 'Penalty for late payment'),
      ('Other Charges', 'Miscellaneous charges')
    `);
  }

  const feeStructuresResult = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM fee_structures WHERE academic_year = $1',
    [academicYear]
  );
  const feeStructuresCount = parseInt(feeStructuresResult.rows[0].count, 10);

  if (feeStructuresCount === 0) {
    const categories = await client.query<{ id: number; name: string }>(
      'SELECT * FROM fee_categories WHERE is_active = true'
    );
    const classes = await client.query<{ id: number; name: string }>(
      'SELECT * FROM classes ORDER BY id'
    );

    for (const classItem of classes.rows) {
      for (const category of categories.rows) {
        if (category.name === 'Transport Fee') continue;

        let amount = 0;
        let frequency = 'monthly';

        switch (category.name) {
          case 'Tuition Fee':
            amount =
              classItem.name.includes('1') ||
              classItem.name.includes('2') ||
              classItem.name.includes('3')
                ? 3000
                : classItem.name.includes('4') ||
                    classItem.name.includes('5') ||
                    classItem.name.includes('6')
                  ? 3500
                  : classItem.name.includes('7') ||
                      classItem.name.includes('8') ||
                      classItem.name.includes('9')
                    ? 4000
                    : 4500;
            break;
          case 'Library Fee':
            amount = 200;
            frequency = 'yearly';
            break;
          case 'Laboratory Fee':
            amount = 500;
            frequency = 'yearly';
            break;
          case 'Sports Fee':
            amount = 300;
            frequency = 'yearly';
            break;
          case 'Examination Fee':
            amount = 100;
            frequency = 'yearly';
            break;
          case 'Activity Fee':
            amount = 150;
            frequency = 'monthly';
            break;
          default:
            amount = 100;
            frequency = 'monthly';
        }

        await client.query(
          `INSERT INTO fee_structures (
            class_id, fee_type, amount, frequency, academic_year,
            category_id, description, is_active, late_fee_percentage, late_fee_days
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            classItem.id,
            category.name,
            amount,
            frequency,
            academicYear,
            category.id,
            `Default ${category.name} for ${classItem.name}`,
            true,
            5,
            7,
          ]
        );
      }
    }
  }

  const studentsWithoutFeesResult = await client.query<{
    id: number;
    class_id: number | null;
  }>(
    `SELECT s.id, s.class_id
     FROM students s
     WHERE s.status = 'active'
     AND NOT EXISTS (
       SELECT 1 FROM student_fees sf
       WHERE sf.student_id = s.id
       AND sf.academic_year = $1
     )`,
    [academicYear]
  );

  let feesAssigned = 0;
  const months = [currentMonth, currentMonth + 1, currentMonth + 2].filter((m) => m <= 12);

  for (const student of studentsWithoutFeesResult.rows) {
    const structures = await client.query<{ id: number; amount: string }>(
      `SELECT * FROM fee_structures
       WHERE (class_id = $1 OR class_id IS NULL)
       AND frequency = 'monthly'
       AND is_active = true
       AND academic_year = $2`,
      [student.class_id, academicYear]
    );

    for (const month of months) {
      for (const feeStructure of structures.rows) {
        const dueDate = new Date(new Date().getFullYear(), month - 1, 10);
        await client.query(
          `INSERT INTO student_fees (
            student_id, fee_structure_id, academic_year, amount_due,
            due_date, month, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (student_id, fee_structure_id, academic_year, month)
          DO NOTHING`,
          [
            student.id,
            feeStructure.id,
            academicYear,
            feeStructure.amount,
            dueDate.toISOString().split('T')[0],
            month,
            'pending',
          ]
        );
        feesAssigned += 1;
      }
    }
  }

  return {
    categoriesCreated: categoriesCount === 0,
    feeStructuresCreated: feeStructuresCount === 0,
    studentsProcessed: studentsWithoutFeesResult.rows.length,
    feesAssigned,
    academic_year: academicYear,
  };
}

export async function POST(request: NextRequest) {
  let db: Awaited<ReturnType<typeof getRequestDb>>['db'] | null = null;

  try {
    const result = await getRequestDb(request);
    db = result.db;

    const body = await request.json().catch(() => ({}));
    const action = body.action || 'initialize_fees';

    if (action === 'ensure_categories') {
      const data = await db.transaction((client) => ensureFeeCategoriesOnly(client));
      return NextResponse.json({
        success: true,
        message: data.categoriesCreated
          ? 'Fee categories created successfully'
          : 'Fee categories already exist',
        data,
      });
    }

    if (action !== 'initialize_fees') {
      return NextResponse.json(
        { success: false, error: 'Invalid action specified' },
        { status: 400 }
      );
    }

    const data = await db.transaction((client) => initializeFees(client));

    return NextResponse.json({
      success: true,
      message: `System initialized successfully! Assigned fees to ${data.studentsProcessed} students (${data.feesAssigned} fee records).`,
      data,
    });
  } catch (error) {
    console.error('Error initializing system:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to initialize system';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
