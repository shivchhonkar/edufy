import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureSystemSettings, syncActiveAcademicYear } from '@/lib/ensure-system-settings';
import {
  getAcademicYearAssociations,
  isAcademicYearDeletable,
} from '@/lib/academic-year-usage';

// GET - Fetch all academic years
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureSystemSettings(db);
    const result = await db.query(
      `SELECT * FROM academic_years ORDER BY start_date DESC`,
      []
    );

    const includeUsage = request.nextUrl.searchParams.get('include_usage') === 'true';
    let data = result.rows;

    if (includeUsage) {
      data = await Promise.all(
        result.rows.map(async (row) => {
          const associations = await getAcademicYearAssociations(db, row.id, row.name);
          return {
            ...row,
            associations,
            is_deletable: isAcademicYearDeletable(row.is_active, associations),
          };
        })
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch academic years';
    console.error('Error fetching academic years:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST - Create new academic year
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureSystemSettings(db);
    const body = await request.json();
    const { name, start_date, end_date, is_active } = body;

    // Validate required fields
    if (!name || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'Name, start date, and end date are required' },
        { status: 400 }
      );
    }

    // Check for duplicate academic year name
    const duplicateCheck = await db.query(
      'SELECT id FROM academic_years WHERE LOWER(name) = LOWER($1)',
      [name]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `Academic year "${name}" already exists. Please use a different name.` },
        { status: 409 }
      );
    }

    // If this academic year is being set as active, deactivate all others
    if (is_active) {
      await db.query('UPDATE academic_years SET is_active = false', []);
    }

    // Insert new academic year
    const result = await db.query(
      `INSERT INTO academic_years (name, start_date, end_date, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [name, start_date, end_date, is_active || false]
    );

    if (is_active) {
      await syncActiveAcademicYear(db, name);
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating academic year:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

