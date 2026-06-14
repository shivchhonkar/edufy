'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertCircle, FiChevronLeft, FiChevronRight, FiPrinter, FiX } from 'react-icons/fi';
import {
  getPrintBatchRanges,
  MAX_BROWSER_PRINT_ROWS,
} from '@/features/students/utils/bulk-edit-export';

interface BulkEditPrintRangeModalProps {
  isOpen: boolean;
  totalCount: number;
  onClose: () => void;
  onPrint: (from: number, to: number) => void;
}

export default function BulkEditPrintRangeModal({
  isOpen,
  totalCount,
  onClose,
  onPrint,
}: BulkEditPrintRangeModalProps) {
  const [mounted, setMounted] = useState(false);
  const batches = useMemo(() => getPrintBatchRanges(totalCount), [totalCount]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(Math.min(MAX_BROWSER_PRINT_ROWS, totalCount));
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setBatchIndex(0);
    const first = batches[0];
    if (first) {
      setFrom(first.start);
      setTo(first.end);
    }
    setError('');
  }, [isOpen, batches]);

  useEffect(() => {
    const matchedIndex = batches.findIndex((batch) => batch.start === from && batch.end === to);
    if (matchedIndex >= 0) {
      setBatchIndex(matchedIndex);
    }
  }, [from, to, batches]);

  const selectedCount = from <= to ? to - from + 1 : 0;
  const activeBatchIndex = batches.findIndex((batch) => batch.start === from && batch.end === to);
  const navBatchIndex = activeBatchIndex >= 0 ? activeBatchIndex : batchIndex;

  const applyBatch = (index: number) => {
    const batch = batches[index];
    if (!batch) return;
    setBatchIndex(index);
    setFrom(batch.start);
    setTo(batch.end);
    setError('');
  };

  const validate = (): boolean => {
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to > totalCount || from > to) {
      setError(`Enter a valid range between 1 and ${totalCount}.`);
      return false;
    }
    if (to - from + 1 > MAX_BROWSER_PRINT_ROWS) {
      setError(`Maximum ${MAX_BROWSER_PRINT_ROWS} records per print. Choose a smaller range.`);
      return false;
    }
    setError('');
    return true;
  };

  const handlePrint = () => {
    if (!validate()) return;
    onPrint(from, to);
    if (activeBatchIndex >= 0 && activeBatchIndex < batches.length - 1) {
      applyBatch(activeBatchIndex + 1);
    }
  };

  const handleFromChange = (value: number) => {
    setFrom(value);
    setError('');
  };

  const handleToChange = (value: number) => {
    setTo(value);
    setError('');
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-print-range-title"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full relative">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <FiAlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="bulk-print-range-title" className="text-lg font-semibold text-gray-900">
                Print student range
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {totalCount.toLocaleString()} students total. Print up to{' '}
                {MAX_BROWSER_PRINT_ROWS.toLocaleString()} records at a time in{' '}
                {batches.length} batch{batches.length !== 1 ? 'es' : ''}.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="print-batch-select" className="block text-sm font-medium text-gray-700 mb-1">
              Quick select batch
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => applyBatch(Math.max(0, navBatchIndex - 1))}
                disabled={navBatchIndex === 0}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous batch"
              >
                <FiChevronLeft size={18} />
              </button>
              <select
                id="print-batch-select"
                value={navBatchIndex}
                onChange={(e) => applyBatch(Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500"
              >
                {batches.map((batch, index) => (
                  <option key={batch.batchIndex} value={index}>
                    Batch {batch.batchIndex} of {batches.length}: records {batch.start.toLocaleString()}–
                    {batch.end.toLocaleString()} ({batch.count.toLocaleString()})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => applyBatch(Math.min(batches.length - 1, navBatchIndex + 1))}
                disabled={navBatchIndex >= batches.length - 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next batch"
              >
                <FiChevronRight size={18} />
              </button>
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">Custom range</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="print-from" className="block text-xs text-gray-500 mb-1">
                  From record
                </label>
                <input
                  id="print-from"
                  type="number"
                  min={1}
                  max={totalCount}
                  value={from}
                  onChange={(e) => handleFromChange(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="print-to" className="block text-xs text-gray-500 mb-1">
                  To record
                </label>
                <input
                  id="print-to"
                  type="number"
                  min={1}
                  max={totalCount}
                  value={to}
                  onChange={(e) => handleToChange(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700">
            Selected: <span className="font-semibold">{selectedCount.toLocaleString()}</span> record
            {selectedCount !== 1 ? 's' : ''} ({from.toLocaleString()}–{to.toLocaleString()})
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="text-xs text-gray-500">
            After each print, the next batch is selected automatically. Repeat until all{' '}
            {batches.length} batches are printed, or use Download CSV for the full list at once.
          </p>
        </div>

        <div className="p-6 border-t border-gray-200 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-6 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <FiPrinter size={16} />
            Print records {from.toLocaleString()}–{to.toLocaleString()}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
