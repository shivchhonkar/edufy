import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import {
  classExists,
  fetchEligibleStudents,
  sectionBelongsToClass,
} from '@/lib/promotion-service';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const classIdParam = request.nextUrl.searchParams.get('class_id');
    const sectionIdParam = request.nextUrl.searchParams.get('section_id');

    if (!classIdParam) {
      return NextResponse.json(
        { success: false, error: 'class_id is required' },
        { status: 400 }
      );
    }

    const classId = parseInt(classIdParam, 10);
    if (!Number.isFinite(classId) || classId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid class_id' }, { status: 400 });
    }

    let sectionId: number | null = null;
    if (sectionIdParam) {
      sectionId = parseInt(sectionIdParam, 10);
      if (!Number.isFinite(sectionId) || sectionId <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid section_id' }, { status: 400 });
      }
    }

    if (!(await classExists(db, classId))) {
      return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 });
    }

    if (sectionId && !(await sectionBelongsToClass(db, sectionId, classId))) {
      return NextResponse.json(
        { success: false, error: 'Section does not belong to the selected class' },
        { status: 400 }
      );
    }

    const students = await fetchEligibleStudents(db, classId, sectionId);

    return NextResponse.json({
      success: true,
      data: students,
      meta: { count: students.length, class_id: classId, section_id: sectionId },
    });
  } catch (error) {
    console.error('Error fetching eligible students:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch eligible students' },
      { status: 500 }
    );
  }
}
