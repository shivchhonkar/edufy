import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { parseStudentId, studentExists } from '@/lib/student-profile-api';
import type { StudentMedicalRecord } from '@/shared/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const result = await db.query<StudentMedicalRecord>(
      'SELECT * FROM student_medical_records WHERE student_id = $1',
      [studentId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0] ?? null,
    });
  } catch (error) {
    console.error('Error fetching student medical record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch medical record' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
      blood_group,
      allergies,
      chronic_disease,
      disability,
      doctor_name,
      doctor_contact,
      emergency_contact,
      medical_notes,
    } = body;

    const result = await db.query<StudentMedicalRecord>(
      `INSERT INTO student_medical_records (
        student_id, blood_group, allergies, chronic_disease, disability,
        doctor_name, doctor_contact, emergency_contact, medical_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (student_id) DO UPDATE SET
        blood_group = EXCLUDED.blood_group,
        allergies = EXCLUDED.allergies,
        chronic_disease = EXCLUDED.chronic_disease,
        disability = EXCLUDED.disability,
        doctor_name = EXCLUDED.doctor_name,
        doctor_contact = EXCLUDED.doctor_contact,
        emergency_contact = EXCLUDED.emergency_contact,
        medical_notes = EXCLUDED.medical_notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        studentId,
        blood_group ?? null,
        allergies ?? null,
        chronic_disease ?? null,
        disability ?? null,
        doctor_name ?? null,
        doctor_contact ?? null,
        emergency_contact ?? null,
        medical_notes ?? null,
      ]
    );

    if (blood_group) {
      await db.query(
        'UPDATE students SET blood_group = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [blood_group, studentId]
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Medical record saved successfully',
    });
  } catch (error) {
    console.error('Error saving student medical record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save medical record' },
      { status: 500 }
    );
  }
}
