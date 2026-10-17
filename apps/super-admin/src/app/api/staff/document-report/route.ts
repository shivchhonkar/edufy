import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrRead } from '@/lib/hr-auth';
import {
  buildStaffDocumentReportRow,
  staffRowHasMissingDocuments,
  type StaffDocumentReportRow,
} from '@/lib/staff-document-report';

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const departmentId = request.nextUrl.searchParams.get('department_id')?.trim() || '';
    const missingOnly = request.nextUrl.searchParams.get('missing_only') === 'true';

    const params: unknown[] = [];
    let where = `WHERE s.status = 'active'`;
    if (departmentId) {
      params.push(parseInt(departmentId, 10));
      where += ` AND s.department_id = $1`;
    }

    const staffResult = await db.query<{
      id: number;
      employee_id: string;
      first_name: string;
      last_name: string;
      department_name: string | null;
      designation: string | null;
      photo_url: string | null;
      aadhaar_number: string | null;
    }>(
      `SELECT s.id, s.employee_id, s.first_name, s.last_name,
              COALESCE(des.name, s.designation) AS designation,
              d.name AS department_name, s.photo_url, s.aadhaar_number
       FROM staff s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN designations des ON s.designation_id = des.id
       ${where}
       ORDER BY s.first_name ASC, s.last_name ASC`,
      params,
    );

    const ids = staffResult.rows.map((row) => row.id);
    const documentsByStaff = new Map<number, string[]>();
    if (ids.length > 0) {
      const documents = await db.query<{ staff_id: number; document_type: string }>(
        `SELECT staff_id, document_type FROM staff_documents WHERE staff_id = ANY($1::int[])`,
        [ids],
      );
      for (const row of documents.rows) {
        const list = documentsByStaff.get(row.staff_id) || [];
        list.push(row.document_type);
        documentsByStaff.set(row.staff_id, list);
      }
    }

    let items: StaffDocumentReportRow[] = staffResult.rows.map((staff) =>
      buildStaffDocumentReportRow({
        ...staff,
        document_types: documentsByStaff.get(staff.id) || [],
      }),
    );

    if (missingOnly) {
      items = items.filter(staffRowHasMissingDocuments);
    }

    const missingCount = items.filter(staffRowHasMissingDocuments).length;

    return NextResponse.json({
      success: true,
      data: { items, missing_count: missingCount },
    });
  } catch (error) {
    console.error('Error loading staff document report:', error);
    return NextResponse.json({ success: false, error: 'Failed to load staff document report' }, { status: 500 });
  }
}
