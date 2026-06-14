import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import {
  isValidAudienceType,
  resolveSmsRecipients,
  type SmsAudienceType,
} from '@/lib/sms-recipients';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const audienceType = request.nextUrl.searchParams.get('audience_type') || 'all_parents';
    const classIdParam = request.nextUrl.searchParams.get('class_id');
    const sectionIdParam = request.nextUrl.searchParams.get('section_id');

    if (!isValidAudienceType(audienceType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid audience_type' },
        { status: 400 }
      );
    }

    const classId = classIdParam ? parseInt(classIdParam, 10) : null;
    const sectionId = sectionIdParam ? parseInt(sectionIdParam, 10) : null;

    const recipients = await resolveSmsRecipients(
      db,
      audienceType as SmsAudienceType,
      classId,
      sectionId
    );

    return NextResponse.json({
      success: true,
      data: recipients,
      meta: { count: recipients.length, audience_type: audienceType },
    });
  } catch (error) {
    console.error('Error resolving SMS recipients:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve recipients' },
      { status: 500 }
    );
  }
}
