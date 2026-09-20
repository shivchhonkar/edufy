'use client';

import { useCallback, useEffect, useState } from 'react';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';
import { useDialog } from '@/shared/context/DialogContext';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { useSettings } from '@/shared/SettingsContext';

interface PaymentRow {
  id: number;
  first_name: string;
  last_name: string;
  receipt_number: string;
  payment_date: string;
  amount_paid: string | number;
  status: string;
}

interface ReversalRow {
  id: number;
  receipt_number: string;
  first_name: string;
  last_name: string;
  amount_paid: string | number;
  reason: string;
  reversed_at: string;
}

export default function FeeReversalsPage() {
  const { alert, confirm } = useDialog();
  const { settings } = useSettings();
  const { selectedAcademicYear } = useEnrollmentSession();
  const academicYear = selectedAcademicYear?.name || settings.academic_year || '';
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [reversals, setReversals] = useState<ReversalRow[]>([]);
  const [search, setSearch] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const [payRes, revRes] = await Promise.all([
      fetch('/api/fees?status=completed'),
      fetch(`/api/fees/reversals?academic_year=${encodeURIComponent(academicYear)}`),
    ]);
    const payData = await payRes.json();
    const revData = await revRes.json();
    if (payData.success) setPayments(payData.data || []);
    if (revData.success) setReversals(revData.data || []);
  }, [academicYear]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredPayments = payments.filter((row) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return `${row.first_name} ${row.last_name} ${row.receipt_number}`.toLowerCase().includes(q);
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await confirm('Reverse this receipt and restore the student dues?', {
      type: 'danger',
      confirmText: 'Reverse',
    });
    if (!ok) return;
    const res = await fetch('/api/fees/reversals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: paymentId, reason }),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Reversal failed', { title: 'Error', type: 'error' });
      return;
    }
    setPaymentId('');
    setReason('');
    load();
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <FeesPageHeader title="Fee Reversal" description="Cancel a receipt and put the dues back on the student ledger." />
      <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search receipt or student"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <select
          required
          value={paymentId}
          onChange={(e) => setPaymentId(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
        >
          <option value="">Select receipt to reverse</option>
          {filteredPayments.map((row) => (
            <option key={row.id} value={row.id}>
              {row.receipt_number} — {row.first_name} {row.last_name} — {formatFeeCurrency(row.amount_paid)}
            </option>
          ))}
        </select>
        <textarea
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for reversal"
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white">
          Reverse receipt
        </button>
      </form>
      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {reversals.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">No reversals yet.</p>
        ) : (
          reversals.map((row) => (
            <div key={row.id} className="px-4 py-3 text-sm">
              <p className="font-medium">
                {row.receipt_number} — {row.first_name} {row.last_name} — {formatFeeCurrency(row.amount_paid)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{new Date(row.reversed_at).toLocaleString()} · {row.reason}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
