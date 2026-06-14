import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin, requireHrRead } from '@/lib/hr-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const [components, structures] = await Promise.all([
      db.query('SELECT * FROM salary_components WHERE is_active = true ORDER BY component_type, name'),
      db.query(`
        SELECT ss.*, des.name AS designation_name,
          s.first_name || ' ' || s.last_name AS staff_name
        FROM salary_structures ss
        LEFT JOIN designations des ON ss.designation_id = des.id
        LEFT JOIN staff s ON ss.staff_id = s.id
        WHERE ss.is_active = true ORDER BY ss.name
      `),
    ]);

    const structuresWithLines = await Promise.all(
      structures.rows.map(async (s: { id: number }) => {
        const lines = await db.query(
          `SELECT ssl.*, sc.name AS component_name, sc.component_type
           FROM salary_structure_lines ssl
           JOIN salary_components sc ON ssl.component_id = sc.id
           WHERE ssl.structure_id = $1`,
          [s.id]
        );
        return { ...s, lines: lines.rows };
      })
    );

    return NextResponse.json({
      success: true,
      data: { components: components.rows, structures: structuresWithLines },
    });
  } catch (error) {
    console.error('Salary structures fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch salary structures' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const { name, designation_id, staff_id, effective_from, effective_to, lines } = await request.json();
    if (!name?.trim() || !effective_from) {
      return NextResponse.json({ success: false, error: 'name and effective_from required' }, { status: 400 });
    }

    const structure = await db.query(
      `INSERT INTO salary_structures (name, designation_id, staff_id, effective_from, effective_to)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), designation_id || null, staff_id || null, effective_from, effective_to || null]
    );
    const structureId = structure.rows[0].id;

    if (Array.isArray(lines)) {
      for (const line of lines) {
        await db.query(
          `INSERT INTO salary_structure_lines (structure_id, component_id, amount, percentage_of_basic)
           VALUES ($1, $2, $3, $4) ON CONFLICT (structure_id, component_id)
           DO UPDATE SET amount = $3, percentage_of_basic = $4`,
          [structureId, line.component_id, line.amount || null, line.percentage_of_basic || null]
        );
      }
    }

    return NextResponse.json({ success: true, data: structure.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Salary structure create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create salary structure' }, { status: 500 });
  }
}
