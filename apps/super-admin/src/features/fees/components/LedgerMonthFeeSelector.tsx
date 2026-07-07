'use client';

import { useMemo } from 'react';
import {
  getFeeLateFeeOutstanding,
  getFeeOutstanding,
  getFeePrincipalBalance,
  isFeeFullySettled,
  isTransportFee,
  isTuitionFee,
  type FeeBalanceRecord,
} from '@/features/fees/utils/fee-balance';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';

export type LedgerMonthFeeRecord = FeeBalanceRecord & {
  id: number;
  fee_type?: string;
  due_date?: string;
};

export type LedgerMonthRow = {
  monthIndex: number;
  monthName: string;
  monthLabel: string;
  monthFees: LedgerMonthFeeRecord[];
  totalBalance: number;
  isPastOrCurrent: boolean;
  hasFees: boolean;
};

interface LedgerMonthFeeSelectorProps {
  rows: LedgerMonthRow[];
  hasTransport: boolean;
  selectedFeeIds: Set<number>;
  onSelectionChange: (ids: Set<number>) => void;
  onExemptFee: (fee: LedgerMonthFeeRecord, monthLabel: string) => void;
  onExemptAll: () => void;
  exemptingFeeId?: number | null;
  exemptingAll?: boolean;
}

function getBalance(fee: LedgerMonthFeeRecord) {
  return Math.max(
    0,
    parseFloat(String(fee.amount_due || 0)) - parseFloat(String(fee.amount_paid || 0)),
  );
}

function getFeeDisplayAmount(
  fee: LedgerMonthFeeRecord,
  isPaid: boolean,
  isExempted: boolean,
) {
  if (isPaid || isExempted) {
    const amountDue = parseFloat(String(fee.amount_due || 0));
    if (amountDue > 0) return amountDue;
    return parseFloat(String(fee.amount_paid || 0));
  }
  const principal = getFeePrincipalBalance(fee);
  return principal || getBalance(fee);
}

function feeLineLabel(fee: LedgerMonthFeeRecord) {
  if (fee.fee_type) return fee.fee_type;
  if (isTuitionFee(fee)) return 'Tuition Fee';
  if (isTransportFee(fee)) return 'Transport Fee';
  return 'Fee';
}

function canExemptFee(fee: LedgerMonthFeeRecord) {
  if (fee.status === 'exempted') return false;
  if (isFeeFullySettled(fee)) return false;
  return getBalance(fee) > 0 || getFeeOutstanding(fee) > 0;
}

function getCardStatus(row: LedgerMonthRow) {
  const hasExempted = row.monthFees.some((f) => f.status === 'exempted');
  if (hasExempted && row.totalBalance <= 0) {
    return { label: 'EXEMPTED', className: 'bg-purple-100 text-purple-800' };
  }

  if (row.totalBalance <= 0) {
    return { label: 'PAID', className: 'bg-green-100 text-green-800' };
  }

  if (!row.isPastOrCurrent) {
    return { label: 'ADVANCE', className: 'bg-blue-100 text-blue-800' };
  }

  const hasLate = row.monthFees.some((f) => getFeeLateFeeOutstanding(f) > 0);
  if (hasLate) {
    return { label: 'LATE FEE', className: 'bg-orange-100 text-orange-800' };
  }

  return { label: 'PENDING', className: 'bg-orange-100 text-orange-800' };
}

function cardShellClass(row: LedgerMonthRow) {
  const status = getCardStatus(row);
  if (status.label === 'EXEMPTED') return 'bg-purple-50 border-purple-200';
  if (status.label === 'PAID') return 'bg-green-50 border-green-200';
  if (status.label === 'ADVANCE') return 'bg-white border-gray-200';
  return 'bg-orange-50 border-orange-200';
}

function payableFeeIds(rows: LedgerMonthRow[], filter?: (row: LedgerMonthRow) => boolean) {
  const ids: number[] = [];
  for (const row of rows) {
    if (filter && !filter(row)) continue;
    for (const fee of row.monthFees) {
      if (fee.status === 'exempted') continue;
      if (getBalance(fee) > 0 || getFeeOutstanding(fee) > 0) {
        ids.push(fee.id);
      }
    }
  }
  return ids;
}

export default function LedgerMonthFeeSelector({
  rows,
  hasTransport,
  selectedFeeIds,
  onSelectionChange,
  onExemptFee,
  onExemptAll,
  exemptingFeeId = null,
  exemptingAll = false,
}: LedgerMonthFeeSelectorProps) {
  const visibleRows = useMemo(
    () => rows.filter((row) => row.hasFees || row.isPastOrCurrent),
    [rows],
  );

  const hasExemptableFees = useMemo(
    () => visibleRows.some((row) => row.monthFees.some((fee) => canExemptFee(fee))),
    [visibleRows],
  );

  const toggleFee = (feeId: number) => {
    const next = new Set(selectedFeeIds);
    if (next.has(feeId)) next.delete(feeId);
    else next.add(feeId);
    onSelectionChange(next);
  };

  const setFeeIds = (ids: number[]) => {
    onSelectionChange(new Set(ids));
  };

  const pendingIds = payableFeeIds(visibleRows, (row) => row.isPastOrCurrent);
  const allPayableIds = payableFeeIds(visibleRows);
  const allPendingSelected =
    pendingIds.length > 0 && pendingIds.every((id) => selectedFeeIds.has(id));
  const allPayableSelected =
    allPayableIds.length > 0 && allPayableIds.every((id) => selectedFeeIds.has(id));

  if (visibleRows.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-4 border-b border-gray-100 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm text-gray-900">Select Months to Pay</h3>
        <div className="flex flex-wrap items-center gap-2">
          {hasTransport && (
            <span className="text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded">
              Transport
            </span>
          )}
          {pendingIds.length > 0 && (
            <button
              type="button"
              onClick={() => setFeeIds(allPendingSelected ? [] : pendingIds)}
              className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200"
            >
              Pay All Pending
            </button>
          )}
          {allPayableIds.length > 0 && (
            <button
              type="button"
              onClick={() => setFeeIds(allPayableSelected ? [] : allPayableIds)}
              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
            >
              Pay All
            </button>
          )}
          {hasExemptableFees && (
            <button
              type="button"
              onClick={onExemptAll}
              disabled={exemptingAll}
              className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 disabled:opacity-50"
              title="Exempt all pending fees for this student"
            >
              {exemptingAll ? 'Exempting…' : 'Exempt All'}
            </button>
          )}
          {selectedFeeIds.size > 0 && (
            <button
              type="button"
              onClick={() => onSelectionChange(new Set())}
              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
        {visibleRows.map((row) => {
          const cardStatus = getCardStatus(row);

          return (
            <div key={row.monthIndex} className={`border rounded-lg p-3 ${cardShellClass(row)}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-sm text-gray-900">{row.monthLabel}</h4>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide ${cardStatus.className}`}
                >
                  {cardStatus.label}
                </span>
              </div>

              <div className="space-y-1.5">
                {row.monthFees.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-1">No fees assigned</p>
                ) : (
                  row.monthFees.map((fee) => {
                    const isExempted = fee.status === 'exempted';
                    const isPaid = isFeeFullySettled(fee) && !isExempted;
                    const hasOutstanding = getFeeOutstanding(fee) > 0;
                    const lateFee = getFeeLateFeeOutstanding(fee);
                    const displayAmount = getFeeDisplayAmount(fee, isPaid, isExempted);
                    const isSelected = selectedFeeIds.has(fee.id);
                    const showExempt = canExemptFee(fee);
                    const isExempting = exemptingFeeId === fee.id;

                    return (
                      <div
                        key={fee.id}
                        className={`relative flex items-center gap-2 p-2 rounded border ${
                          isExempted
                            ? 'bg-white/60 border-purple-200 opacity-80'
                            : isPaid
                              ? 'bg-white/60 border-green-200'
                              : isSelected
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white border-gray-200 hover:border-blue-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!hasOutstanding || isExempted}
                          onChange={() => toggleFee(fee.id)}
                          className="w-4 h-4 text-primary-600 flex-shrink-0 rounded border-gray-300 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-gray-900 block truncate">
                            {feeLineLabel(fee)}
                          </span>
                          {isExempted && (
                            <span className="text-[10px] text-purple-600">Exempted</span>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div
                            className={`text-sm ${
                              isPaid || isExempted ? 'text-gray-500 line-through' : 'text-gray-900'
                            }`}
                          >
                            {formatFeeCurrency(displayAmount)}
                          </div>
                          {lateFee > 0 && !isExempted && !isPaid && (
                            <div className="text-[10px] text-red-600">
                              +{formatFeeCurrency(lateFee)} late fee
                            </div>
                          )}
                        </div>
                        {showExempt && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onExemptFee(fee, row.monthLabel);
                            }}
                            disabled={isExempting || exemptingAll}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 flex-shrink-0"
                            title={`Exempt ${feeLineLabel(fee)}`}
                          >
                            {isExempting ? '…' : 'Exempt'}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function countSelectedMonths(rows: LedgerMonthRow[], selectedFeeIds: Set<number>) {
  return rows.filter((row) => row.monthFees.some((fee) => selectedFeeIds.has(fee.id))).length;
}
