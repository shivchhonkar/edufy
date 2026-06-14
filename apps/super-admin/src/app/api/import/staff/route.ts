import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { csvToObjects } from '@/lib/csv-import';
import { generateEmployeeId } from '@/lib/utils';

interface StaffCsvRow extends Record<string, string> {
  first_name: string;
  last_name: string;
  phone: string;
  department?: string;
  designation?: string;
  email?: string;
  date_of_joining?: string;
  basic_salary?: string;
  gender?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { csv } = body;

    if (!csv?.trim()) {
      return NextResponse.json({ success: false, error: 'CSV content is required' }, { status: 400 });
    }

    const { rows, errors } = csvToObjects<StaffCsvRow>(csv, [
      'first_name',
      'last_name',
      'phone',
    ]);

    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors.join('; ') }, { status: 400 });
    }

    let created = 0;
    const rowErrors: string[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        await db.query(
          `INSERT INTO staff (
            employee_id, first_name, last_name, phone, email, gender,
            department, designation, date_of_joining, salary, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active')`,
          [
            generateEmployeeId(),
            row.first_name,
            row.last_name,
            row.phone,
            row.email || null,
            row.gender || 'Male',
            row.department || 'General',
            row.designation || 'Staff',
            row.date_of_joining || new Date().toISOString().split('T')[0],
            row.basic_salary ? parseFloat(row.basic_salary) : 0,
          ]
        );
        created += 1;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        rowErrors.push(`Row ${i + 2}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: { created, failed: rowErrors.length, errors: rowErrors },
      message: `Imported ${created} staff member(s)`,
    });
  } catch (error) {
    console.error('Staff import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import staff' },
      { status: 500 }
    );
  }
}
