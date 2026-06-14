import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const accountId = request.nextUrl.searchParams.get('account_id');

    if (accountId) {
      const ledger = await db.query(
        `SELECT je.entry_date, je.description, je.reference, jl.debit, jl.credit,
                a.code, a.name AS account_name
         FROM journal_lines jl
         INNER JOIN journal_entries je ON jl.entry_id = je.id
         INNER JOIN accounting_accounts a ON jl.account_id = a.id
         WHERE jl.account_id = $1
         ORDER BY je.entry_date DESC, je.id DESC`,
        [parseInt(accountId, 10)]
      );

      const balance = ledger.rows.reduce((acc, row) => {
        return acc + parseFloat(String(row.debit ?? '0')) - parseFloat(String(row.credit ?? '0'));
      }, 0);

      return NextResponse.json({
        success: true,
        data: { ledger: ledger.rows, balance },
      });
    }

    const entries = await db.query(
      `SELECT je.*, COUNT(jl.id)::int AS line_count,
              COALESCE(SUM(jl.debit), 0) AS total_debit,
              COALESCE(SUM(jl.credit), 0) AS total_credit
       FROM journal_entries je
       LEFT JOIN journal_lines jl ON je.id = jl.entry_id
       GROUP BY je.id
       ORDER BY je.entry_date DESC, je.id DESC
       LIMIT 100`
    );

    return NextResponse.json({ success: true, data: entries.rows });
  } catch (error) {
    console.error('Journal error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch journal. Run phase9 migration.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const { entry_date, description, reference, lines } = await request.json();

    if (!description || !Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json(
        { success: false, error: 'description and at least 2 journal lines are required' },
        { status: 400 }
      );
    }

    const totalDebit = lines.reduce((s: number, l: { debit?: number }) => s + (l.debit || 0), 0);
    const totalCredit = lines.reduce((s: number, l: { credit?: number }) => s + (l.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { success: false, error: 'Debits must equal credits' },
        { status: 400 }
      );
    }

    const entry = await db.transaction(async (client) => {
      const entryResult = await client.query(
        `INSERT INTO journal_entries (entry_date, description, reference)
         VALUES ($1, $2, $3) RETURNING *`,
        [entry_date || new Date().toISOString().split('T')[0], description, reference || null]
      );

      const entryId = entryResult.rows[0].id;

      for (const line of lines) {
        await client.query(
          `INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            entryId,
            line.account_id,
            line.debit || 0,
            line.credit || 0,
            line.description || null,
          ]
        );
      }

      return entryResult.rows[0];
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    console.error('Journal create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create journal entry' }, { status: 500 });
  }
}
