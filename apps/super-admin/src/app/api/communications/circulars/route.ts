import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureCommunicationsSchema } from '@/lib/ensure-communications-schema';
import { isValidAudienceType } from '@/lib/sms-recipients';

const LIST_QUERY = `
  SELECT sc.*,
    c.name AS class_name,
    sec.name AS section_name
  FROM school_circulars sc
  LEFT JOIN classes c ON sc.class_id = c.id
  LEFT JOIN sections sec ON sc.section_id = sec.id
  WHERE 1=1
`;

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureCommunicationsSchema(db);

    const status = request.nextUrl.searchParams.get('status');
    const search = request.nextUrl.searchParams.get('search');

    const params: unknown[] = [];
    let query = LIST_QUERY;

    if (status) {
      params.push(status);
      query += ` AND sc.status = $${params.length}`;
    }
    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (sc.title ILIKE $${params.length} OR sc.content ILIKE $${params.length} OR sc.circular_number ILIKE $${params.length})`;
    }

    query += ` ORDER BY sc.created_at DESC`;

    const result = await db.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Circulars GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch circulars' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureCommunicationsSchema(db);

    const body = await request.json();
    const {
      title,
      content,
      circular_number,
      audience_type,
      class_id,
      section_id,
      priority,
      effective_date,
      expires_at,
      send_sms,
      status,
    } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'title and content are required' },
        { status: 400 }
      );
    }

    if (!isValidAudienceType(audience_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid audience_type' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO school_circulars (
        title, content, circular_number, audience_type, class_id, section_id,
        priority, effective_date, expires_at, send_sms, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        title.trim(),
        content.trim(),
        circular_number?.trim() || null,
        audience_type,
        class_id || null,
        section_id || null,
        priority || 'normal',
        effective_date || null,
        expires_at || null,
        Boolean(send_sms),
        status === 'published' ? 'draft' : status || 'draft',
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Circulars POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create circular' },
      { status: 500 }
    );
  }
}
