import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireStudentFromParams } from '@/lib/require-student-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = requireStudentFromParams(request, params.id);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    const result = await query(
      `SELECT blood_group, allergies, chronic_disease, disability,
              doctor_name, doctor_contact, emergency_contact, medical_notes
       FROM student_medical_records
       WHERE student_id = $1`,
      [studentId]
    );

    return NextResponse.json({ success: true, data: result.rows[0] ?? null });
  } catch (error) {
    console.error('Error fetching medical record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch medical record' },
      { status: 500 }
    );
  }
}
