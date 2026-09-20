'use client';

import { useCallback, useEffect, useState } from 'react';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';
import { useDialog } from '@/shared/context/DialogContext';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { useSettings } from '@/shared/SettingsContext';

interface PaymentRow {
  id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  receipt_number: string;
  payment_date: string;
  amount_paid: string | number;
  refunded_amount?: string | number;
  status: string;
}

interface RefundRow {
  id: number;
  receipt_number: string;
  first_name: string;
  last_name: string;
  amount: string | number;
  refund_date: string;
  method: string;
  remarks?: string;
}

export default function FeeRefundsPage() {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const { selectedAcademicYear } = useEnrollmentSession();
  const academicYear = selectedAcademicYear?.name || settings.academic_year || '';
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    payment_id: '',
    amount: '',
    refund_date: new Date().toISOString().slice(0, 10),
    method: 'cash',
    remarks: '',
  });

  const load = useCallback(async () => {
    const [payRes, refundRes] = await Promise.all([
      fetch('/api/fees?status=completed'),
      fetch(`/api/fees/refunds?academic_year=${encodeURIComponent(academicYear)}`),
    ]);
    const payData = await payRes.json();
    const refundData = await refundRes.json();
    if (payData.success) setPayments(payData.data || []);
    if (refundData.success) setRefunds(refundData.data || []);
  }, [academicYear]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = payments.find((row) => String(row.id) === form.payment_id);
  const filteredPayments = payments.filter((row) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return `${row.first_name} ${row.last_name} ${row.admission_number} ${row.receipt_number}`.toLowerCase().includes(q);
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/fees/refunds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Refund failed', { title: 'Error', type: 'error' });
      return;
    }
    setForm((prev) => ({ ...prev, payment_id: '', amount: '', remarks: '' }));
    load();
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <FeesPageHeader title="Refund Voucher" description="Refund a collected receipt and restore the student due." />
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
          value={form.payment_id}
          onChange={(e) => setForm((prev) => ({ ...prev, payment_id: e.target.value }))}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
        >
          <option value="">Select receipt</option>
          {filteredPayments.map((row) => (
            <option key={row.id} value={row.id}>
              {row.receipt_number} — {row.first_name} {row.last_name} — {formatFeeCurrency(row.amount_paid)}
            </option>
          ))}
        </select>
        {selected && (
          <p className="text-xs text-gray-500">
            Paid {formatFeeCurrency(selected.amount_paid)} on {String(selected.payment_date).slice(0, 10)}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            placeholder="Refund amount"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            required
            value={form.refund_date}
            onChange={(e) => setForm((prev) => ({ ...prev, refund_date: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <select
            value={form.method}
            onChange={(e) => setForm((prev) => ({ ...prev, method: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
          >
            <option value="cash">Cash</option>
            <option value="online">Online</option>
            <option value="bank">Bank</option>
          </select>
        </div>
        <input
          value={form.remarks}
          onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
          placeholder="Remarks"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white">
          Save refund
        </button>
      </form>
      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {refunds.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">No refunds yet.</p>
        ) : (
          refunds.map((row) => (
            <div key={row.id} className="px-4 py-3 flex justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{row.receipt_number} — {row.first_name} {row.last_name}</p>
                <p className="text-xs text-gray-500">{String(row.refund_date).slice(0, 10)} · {row.method} · {row.remarks || ''}</p>
              </div>
              <span className="font-medium text-red-700">{formatFeeCurrency(row.amount)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
