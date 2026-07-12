import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { ensureStudentMotherColumns } from '@/lib/student-profile-api';
import { studentSearchSql } from '@/lib/student-search';
import { staffSearchSql } from '@/lib/staff-search';

export type HostSearchOptionType = 'staff' | 'student';

export interface HostSearchOption {
  type: HostSearchOptionType;
  id: number;
  name: string;
  phone: string;
  subtitle: string;
  department_name?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    const query = request.nextUrl.searchParams.get('q')?.trim() || '';
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '10', 10), 20);

    if (query.length < 2) {
      return NextResponse.json({ success: true, data: [] as HostSearchOption[] });
    }

    await ensureHrSchema(db);
    await ensureStudentMotherColumns(db);

    const searchValue = `%${query}%`;
    const perTypeLimit = Math.ceil(limit / 2);

    let staffRows: Record<string, unknown>[] = [];
    try {
      const staffResult = await db.query(
        `SELECT s.id, s.first_name, s.last_name, s.phone, s.employee_id,
                d.name AS department_name, des.name AS designation_name
         FROM staff s
         LEFT JOIN departments d ON s.department_id = d.id
         LEFT JOIN designations des ON s.designation_id = des.id
         WHERE s.status = 'active'
           AND ${staffSearchSql(1)}
         ORDER BY s.first_name ASC, s.last_name ASC
         LIMIT $2`,
        [searchValue, perTypeLimit],
      );
      staffRows = staffResult.rows;
    } catch (staffError) {
      console.error('Host search staff query failed:', staffError);
    }

    let studentRows: Record<string, unknown>[] = [];
    try {
      const studentResult = await db.query(
        `SELECT s.id, s.first_name, s.middle_name, s.last_name, s.admission_number,
                s.roll_number, s.parent_phone,
                c.name AS class_name, sec.name AS section_name
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         LEFT JOIN sections sec ON s.section_id = sec.id
         WHERE s.status = 'active'
           AND ${studentSearchSql(1)}
         ORDER BY s.first_name ASC, s.last_name ASC
         LIMIT $2`,
        [searchValue, perTypeLimit],
      );
      studentRows = studentResult.rows;
    } catch (studentError) {
      console.error('Host search student query failed:', studentError);
    }

    const staff: HostSearchOption[] = staffRows.map((row) => {
      const name = `${row.first_name || ''} ${row.last_name || ''}`.trim();
      const roleLabel = [row.designation_name, row.department_name].filter(Boolean).join(' · ');

      return {
        type: 'staff',
        id: Number(row.id),
        name,
        phone: String(row.phone || ''),
        subtitle: [roleLabel || 'Staff', row.employee_id].filter(Boolean).join(' · '),
        department_name: (row.department_name as string) || null,
      };
    });

    const students: HostSearchOption[] = studentRows.map((row) => {
      const name = [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ');
      const classLabel = [row.class_name, row.section_name].filter(Boolean).join(' - ');

      return {
        type: 'student',
        id: Number(row.id),
        name,
        phone: String(row.parent_phone || ''),
        subtitle: [classLabel || 'Unassigned', row.admission_number].filter(Boolean).join(' · '),
        department_name: classLabel || null,
      };
    });

    const data = [...staff, ...students].slice(0, limit);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error searching hosts for visitor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search staff and students' },
      { status: 500 },
    );
  }
}
