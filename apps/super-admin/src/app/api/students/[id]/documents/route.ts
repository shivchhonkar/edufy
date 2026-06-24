import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureStudentDocumentsSchema } from '@/lib/ensure-student-documents-schema';
import {
  isValidDocumentType,
  parseStudentId,
  studentExists,
} from '@/lib/student-profile-api';
import type { StudentDocument } from '@/shared/types';

interface StudentDocumentRow extends StudentDocument {
  uploaded_by_name?: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { db } = await getRequestDb(request);
    const studentId = parseStudentId(params.id);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }

    if (!(await studentExists(db, studentId))) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    await ensureStudentDocumentsSchema(db);

    const result = await db.query<StudentDocumentRow>(
      `SELECT sd.*, u.full_name AS uploaded_by_name
       FROM student_documents sd
       LEFT JOIN users u ON sd.uploaded_by = u.id
       WHERE sd.student_id = $1
       ORDER BY sd.uploaded_at DESC, sd.id DESC`,
      [studentId],
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching student documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { db } = await getRequestDb(request);
    const studentId = parseStudentId(params.id);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }

    if (!(await studentExists(db, studentId))) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      document_type,
      file_name,
      file_path,
      issue_date,
      expiry_date,
      remarks,
    } = body;

    if (!document_type || !file_name?.trim() || !file_path?.trim()) {
      return NextResponse.json(
        { success: false, error: 'document_type, file_name, and file_path are required' },
        { status: 400 },
      );
    }

    if (!isValidDocumentType(document_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document_type' },
        { status: 400 },
      );
    }

    await ensureStudentDocumentsSchema(db);

    const result = await db.query<StudentDocument>(
      `INSERT INTO student_documents (
        student_id, document_type, file_name, file_path,
        issue_date, expiry_date, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        studentId,
        document_type,
        file_name.trim(),
        file_path.trim(),
        issue_date || null,
        expiry_date || null,
        remarks || null,
      ],
    );

    return NextResponse.json(
      { success: true, data: result.rows[0], message: 'Document saved successfully' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating student document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save document' },
      { status: 500 },
    );
  }
}
