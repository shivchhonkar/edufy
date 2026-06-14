import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { csvToObjects } from '@/lib/csv-import';
import { generateAdmissionNumber } from '@/lib/utils';

interface StudentCsvRow extends Record<string, string> {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  parent_name: string;
  parent_phone: string;
  class_name?: string;
  section_name?: string;
  admission_date?: string;
  parent_email?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { csv } = body;

    if (!csv?.trim()) {
      return NextResponse.json({ success: false, error: 'CSV content is required' }, { status: 400 });
    }

    const { rows, errors } = csvToObjects<StudentCsvRow>(csv, [
      'first_name',
      'last_name',
      'date_of_birth',
      'gender',
      'parent_name',
      'parent_phone',
    ]);

    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors.join('; ') }, { status: 400 });
    }

    const classResult = await db.query<{ id: number; name: string }>('SELECT id, name FROM classes');
    const sectionResult = await db.query<{ id: number; class_id: number; name: string }>(
      'SELECT id, class_id, name FROM sections'
    );

    const classMap = new Map(classResult.rows.map((c) => [c.name.toLowerCase(), c.id]));
    const sectionMap = new Map(
      sectionResult.rows.map((s) => [`${s.class_id}:${s.name.toLowerCase()}`, s.id])
    );

    let created = 0;
    const rowErrors: string[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        const classId = row.class_name
          ? classMap.get(row.class_name.toLowerCase()) ?? null
          : null;
        const sectionId =
          classId && row.section_name
            ? sectionMap.get(`${classId}:${row.section_name.toLowerCase()}`) ?? null
            : null;

        const admissionDate =
          row.admission_date || new Date().toISOString().split('T')[0];

        const result = await db.query(
          `INSERT INTO students (
            admission_number, first_name, last_name, date_of_birth, gender,
            class_id, section_id, parent_name, parent_phone, parent_email,
            admission_date, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active')
          RETURNING id`,
          [
            generateAdmissionNumber(),
            row.first_name,
            row.last_name,
            row.date_of_birth,
            row.gender,
            classId,
            sectionId,
            row.parent_name,
            row.parent_phone,
            row.parent_email || null,
            admissionDate,
          ]
        );

        if (classId && result.rows[0]?.id) {
          const ay = await db.query<{ name: string; id: number }>(
            'SELECT id, name FROM academic_years WHERE is_active = true LIMIT 1'
          );
          const academicYear =
            ay.rows[0]?.name ||
            `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
          await db.query(
            `INSERT INTO student_enrollments (
              student_id, academic_year_id, academic_year, class_id, section_id, status, is_current
            ) VALUES ($1,$2,$3,$4,$5,'active',true)
            ON CONFLICT DO NOTHING`,
            [result.rows[0].id, ay.rows[0]?.id ?? null, academicYear, classId, sectionId]
          ).catch(() => {});
        }

        created += 1;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        rowErrors.push(`Row ${i + 2}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: { created, failed: rowErrors.length, errors: rowErrors },
      message: `Imported ${created} student(s)`,
    });
  } catch (error) {
    console.error('Student import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import students' },
      { status: 500 }
    );
  }
}
