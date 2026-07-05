import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTimetableSchema } from '@/lib/ensure-timetable-schema';
import { computeChainedPeriodUpdates, sortPeriodsByOrder } from '@/features/timetable/utils';
import type { TimetablePeriod } from '@/features/timetable/types';

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTimetableSchema(db);

    const body = await request.json().catch(() => ({}));
    const fromPeriodId = body.from_period_id ? parseInt(String(body.from_period_id), 10) : null;

    const result = await db.query(
      `SELECT id, name, start_time, end_time, sort_order, is_active, slot_type, is_schedulable
       FROM timetable_periods
       ORDER BY sort_order, id`,
    );

    const allPeriods = result.rows as TimetablePeriod[];
    let updates = computeChainedPeriodUpdates(allPeriods);

    if (fromPeriodId) {
      const sorted = sortPeriodsByOrder(allPeriods);
      const fromIndex = sorted.findIndex((period) => period.id === fromPeriodId);
      if (fromIndex >= 0) {
        updates = updates.filter((update) => {
          const updateIndex = sorted.findIndex((period) => period.id === update.id);
          return updateIndex > fromIndex;
        });
      }
    }

    if (!updates.length) {
      return NextResponse.json({
        success: true,
        message: 'Period chain is already in sync',
        data: { updated_count: 0 },
      });
    }

    await db.query('BEGIN');
    try {
      for (const update of updates) {
        await db.query(
          `UPDATE timetable_periods
           SET start_time = $1, end_time = $2
           WHERE id = $3`,
          [update.start_time, update.end_time, update.id],
        );
      }
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} following period(s)`,
      data: { updated_count: updates.length, updates },
    });
  } catch (error) {
    console.error('Period sync-chain error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync period chain' },
      { status: 500 },
    );
  }
}
