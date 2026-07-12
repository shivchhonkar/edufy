import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentDocumentsSchema } from '@/lib/ensure-student-documents-schema';
import { ensureTcSchema } from '@/lib/ensure-tc-schema';
import {
  buildStudentDocumentReportRow,
  type GuardianSnapshot,
  type StudentDocumentReportInput,
  type StudentDocumentReportRow,
} from '@/lib/student-document-report';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureStudentDocumentsSchema(db);
    await ensureTcSchema(db);

    const { searchParams } = request.nextUrl;
    const classId = searchParams.get('class_id')?.trim() || '';
    const sectionId = searchParams.get('section_id')?.trim() || '';
    const missingOnly = searchParams.get('missing_only') === 'true';

    const conditions = [`s.status = 'active'`];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (classId === 'unassigned') {
      conditions.push('s.class_id IS NULL');
    } else if (classId) {
      conditions.push(`s.class_id = $${paramIndex}`);
      params.push(parseInt(classId, 10));
      paramIndex += 1;
    }

    if (sectionId) {
      conditions.push(`s.section_id = $${paramIndex}`);
      params.push(parseInt(sectionId, 10));
      paramIndex += 1;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const studentsResult = await db.query<{
      id: number;
      admission_number: string;
      first_name: string;
      middle_name: string | null;
      last_name: string;
      parent_name: string | null;
      aadhaar_no: string | null;
      photo_url: string | null;
      class_name: string | null;
      section_name: string | null;
      first_adm_class: string | null;
    }>(
      `SELECT s.id, s.admission_number, s.first_name, s.middle_name, s.last_name,
              s.parent_name, s.aadhaar_no, s.photo_url,
              c.name AS class_name, sec.name AS section_name,
              COALESCE(
                (
                  SELECT fc.name
                  FROM student_enrollments e
                  JOIN classes fc ON fc.id = e.class_id
                  WHERE e.student_id = s.id
                  ORDER BY e.academic_year ASC, e.id ASC
                  LIMIT 1
                ),
                c.name
              ) AS first_adm_class
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       ${whereClause}
       ORDER BY c.name ASC NULLS LAST, sec.name ASC NULLS LAST, s.first_name ASC, s.last_name ASC`,
      params,
    );

    const studentIds = studentsResult.rows.map((row) => row.id);
    if (studentIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          items: [] as StudentDocumentReportRow[],
          total: 0,
          missing_count: 0,
        },
      });
    }

    const documentsResult = await db.query<{ student_id: number; document_type: string }>(
      `SELECT student_id, document_type
       FROM student_documents
       WHERE student_id = ANY($1::int[])`,
      [studentIds],
    );

    const guardiansResult = await db.query<{
      student_id: number;
      relation_type: string;
      aadhaar_no: string | null;
      photo: string | null;
      name: string | null;
    }>(
      `SELECT student_id, relation_type, aadhaar_no, photo, name
       FROM student_guardians
       WHERE student_id = ANY($1::int[])`,
      [studentIds],
    );

    const tcResult = await db.query<{ student_id: number }>(
      `SELECT DISTINCT student_id
       FROM transfer_certificate_generations
       WHERE student_id = ANY($1::int[])`,
      [studentIds],
    );

    const documentsByStudent = new Map<number, string[]>();
    for (const row of documentsResult.rows) {
      const list = documentsByStudent.get(row.student_id) || [];
      list.push(row.document_type);
      documentsByStudent.set(row.student_id, list);
    }

    const guardiansByStudent = new Map<number, GuardianSnapshot[]>();
    for (const row of guardiansResult.rows) {
      const list = guardiansByStudent.get(row.student_id) || [];
      list.push({
        relation_type: row.relation_type,
        aadhaar_no: row.aadhaar_no,
        photo: row.photo,
        name: row.name,
      });
      guardiansByStudent.set(row.student_id, list);
    }

    const tcStudentIds = new Set(tcResult.rows.map((row) => row.student_id));

    let items = studentsResult.rows.map((student) => {
      const input: StudentDocumentReportInput = {
        ...student,
        document_types: documentsByStudent.get(student.id) || [],
        has_tc_generation: tcStudentIds.has(student.id),
        guardians: guardiansByStudent.get(student.id) || [],
      };
      return buildStudentDocumentReportRow(input);
    });

    if (missingOnly) {
      items = items.filter((row) =>
        Object.values({
          tc: row.tc,
          bc: row.bc,
          student_aadhar: row.student_aadhar,
          parents_aadhar: row.parents_aadhar,
          student_photo: row.student_photo,
          father_photo: row.father_photo,
          mother_photo: row.mother_photo,
        }).some((status) => status === 'not_submitted'),
      );
    }

    const missingCount = items.filter((row) =>
      ['tc', 'bc', 'student_aadhar', 'parents_aadhar', 'student_photo', 'father_photo', 'mother_photo'].some(
        (key) => row[key as keyof StudentDocumentReportRow] === 'not_submitted',
      ),
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        items,
        total: items.length,
        missing_count: missingCount,
      },
    });
  } catch (error) {
    console.error('Student document report error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate student document report' },
      { status: 500 },
    );
  }
}
