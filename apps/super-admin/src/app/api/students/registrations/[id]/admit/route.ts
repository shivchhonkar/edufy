import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';
import {
  admitRegistration,
  RegistrationAdmitError,
} from '@/lib/student-registration-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    const id = parseInt(params.id, 10);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    await ensureStudentOperationsSchema(auth.db);
    const body = await request.json().catch(() => ({}));
    const result = await admitRegistration(auth.db, id, {
      section_id: body.section_id ? parseInt(String(body.section_id), 10) : null,
      admission_date: body.admission_date,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof RegistrationAdmitError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error('Error admitting registration:', error);
    return NextResponse.json({ success: false, error: 'Failed to admit registration' }, { status: 500 });
  }
}
