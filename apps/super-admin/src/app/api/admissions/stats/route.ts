import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);

    const [byStatus, followUpToday, recent] = await Promise.all([
      db.query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::text AS count
         FROM admission_inquiries GROUP BY status`
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM admission_inquiries
         WHERE follow_up_date = CURRENT_DATE
           AND status NOT IN ('enrolled', 'lost')`
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM admission_inquiries
         WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`
      ),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const row of byStatus.rows) {
      statusCounts[row.status] = parseInt(row.count, 10);
    }

    const total = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);
    const active = total - (statusCounts.enrolled || 0) - (statusCounts.lost || 0);

    return NextResponse.json({
      success: true,
      data: {
        total,
        active,
        follow_up_today: parseInt(followUpToday.rows[0]?.count || '0', 10),
        new_this_week: parseInt(recent.rows[0]?.count || '0', 10),
        by_status: statusCounts,
      },
    });
  } catch (error) {
    console.error('Error fetching admission stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats. Run phase8 migration.' },
      { status: 500 }
    );
  }
}
