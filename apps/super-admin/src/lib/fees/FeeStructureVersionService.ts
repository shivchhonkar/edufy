import type { RequestDb } from '@/lib/request-db';
import { calculateDueDate } from '@/lib/fees/FeeDateService';

export type FeeStructureVersionRow = {
  id: number;
  fee_structure_id: number;
  version_number: number;
  amount: string | number;
  frequency: string;
};

/**
 * Immutable fee structure versions — historical student_fees retain assigned version.
 */
export const FeeStructureVersionService = {
  async ensureCurrentVersion(
    db: RequestDb,
    feeStructureId: number,
    createdBy?: number
  ): Promise<number> {
    const structure = await db.query<{
      amount: string;
      frequency: string;
      late_fee_percentage: string;
      late_fee_days: number;
      current_version_id: number | null;
    }>(
      `SELECT amount, frequency, late_fee_percentage, late_fee_days, current_version_id
       FROM fee_structures WHERE id = $1`,
      [feeStructureId]
    );

    if (!structure.rows.length) {
      throw new Error(`Fee structure ${feeStructureId} not found`);
    }

    const row = structure.rows[0];
    if (row.current_version_id) {
      return row.current_version_id;
    }

    return FeeStructureVersionService.createVersion(db, {
      feeStructureId,
      amount: parseFloat(row.amount),
      frequency: row.frequency,
      lateFeePercentage: parseFloat(row.late_fee_percentage ?? '0'),
      lateFeeDays: row.late_fee_days ?? 7,
      createdBy,
    });
  },

  async createVersion(
    db: RequestDb,
    params: {
      feeStructureId: number;
      amount: number;
      frequency: string;
      lateFeePercentage?: number;
      lateFeeDays?: number;
      lateFeeFixedAmount?: number;
      lateFeePerDay?: number;
      lateFeeMaxCap?: number | null;
      metadata?: Record<string, unknown>;
      createdBy?: number;
    }
  ): Promise<number> {
    const maxResult = await db.query<{ max_v: number | null }>(
      `SELECT MAX(version_number) AS max_v FROM fee_structure_versions WHERE fee_structure_id = $1`,
      [params.feeStructureId]
    );
    const versionNumber = (maxResult.rows[0]?.max_v ?? 0) + 1;

    const insert = await db.query<{ id: number }>(
      `INSERT INTO fee_structure_versions (
        fee_structure_id, version_number, amount, frequency,
        late_fee_percentage, late_fee_days, late_fee_fixed_amount,
        late_fee_per_day, late_fee_max_cap, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        params.feeStructureId,
        versionNumber,
        params.amount,
        params.frequency,
        params.lateFeePercentage ?? 0,
        params.lateFeeDays ?? 7,
        params.lateFeeFixedAmount ?? 0,
        params.lateFeePerDay ?? 0,
        params.lateFeeMaxCap ?? null,
        JSON.stringify(params.metadata ?? {}),
        params.createdBy ?? null,
      ]
    );

    const versionId = insert.rows[0].id;

    await db.query(
      `UPDATE fee_structures SET current_version_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [versionId, params.feeStructureId]
    );

    return versionId;
  },

  async getVersion(db: RequestDb, versionId: number): Promise<FeeStructureVersionRow | null> {
    const result = await db.query<FeeStructureVersionRow>(
      `SELECT id, fee_structure_id, version_number, amount, frequency
       FROM fee_structure_versions WHERE id = $1`,
      [versionId]
    );
    return result.rows[0] ?? null;
  },

  async listVersions(db: RequestDb, feeStructureId: number) {
    const result = await db.query(
      `SELECT * FROM fee_structure_versions
       WHERE fee_structure_id = $1 ORDER BY version_number DESC`,
      [feeStructureId]
    );
    return result.rows;
  },
};
