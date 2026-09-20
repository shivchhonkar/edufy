import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import {
  listClassAgeRestrictions,
  saveClassAgeRestrictions,
} from '@/lib/class-age-restriction';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const data = await listClassAgeRestrictions(db);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching age restrictions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load age restrictions' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const restrictions = Array.isArray(body.restrictions) ? body.restrictions : null;
    if (!restrictions) {
      return NextResponse.json({ success: false, error: 'restrictions is required' }, { status: 400 });
    }

    await saveClassAgeRestrictions(db, restrictions);
    const data = await listClassAgeRestrictions(db);
    return NextResponse.json({
      success: true,
      data,
      message: 'Age restrictions saved',
    });
  } catch (error) {
    console.error('Error saving age restrictions:', error);
    const message = error instanceof Error ? error.message : 'Failed to save age restrictions';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
