import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { inquiryExists } from '@/lib/admission-inquiry-api';
import {
  convertInquiryToStudent,
  InquiryConvertError,
} from '@/lib/admission-convert-service';

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const inquiryId = parseId(params.id);
    if (!inquiryId) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    if (!(await inquiryExists(db, inquiryId))) {
      return NextResponse.json({ success: false, error: 'Inquiry not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const result = await convertInquiryToStudent(db, inquiryId, {
      class_id: body.class_id,
      section_id: body.section_id,
      admission_date: body.admission_date,
    });

    return NextResponse.json({
      success: true,
      data: { student: result.student, inquiry_id: inquiryId },
      message: 'Inquiry converted to student',
    });
  } catch (error) {
    if (error instanceof InquiryConvertError) {
      return NextResponse.json(
        { success: false, error: error.message, data: error.data },
        { status: error.statusCode }
      );
    }
    console.error('Error converting inquiry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to convert inquiry' },
      { status: 500 }
    );
  }
}
