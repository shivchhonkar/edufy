import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureStudentDocumentsSchema } from '@/lib/ensure-student-documents-schema';
import { parseStudentId, studentExists } from '@/lib/student-profile-api';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } },
) {
  try {
    const { db } = await getRequestDb(request);
    const studentId = parseStudentId(params.id);
    const documentId = parseStudentId(params.documentId);

    if (!studentId || !documentId) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    if (!(await studentExists(db, studentId))) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    await ensureStudentDocumentsSchema(db);

    const result = await db.query(
      'DELETE FROM student_documents WHERE id = $1 AND student_id = $2 RETURNING id',
      [documentId, studentId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting student document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 },
    );
  }
}
