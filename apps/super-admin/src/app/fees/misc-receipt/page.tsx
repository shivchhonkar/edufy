'use client';

import { useEffect, useState } from 'react';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import StudentPickSelect from '@/features/students/components/StudentPickSelect';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { useDialog } from '@/shared/context/DialogContext';
import { useSettings } from '@/shared/SettingsContext';

export default function MiscFeeReceiptPage() {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const { selectedAcademicYear } = useEnrollmentSession();
  const academicYear = selectedAcademicYear?.name || settings.academic_year || '';
  const [heads, setHeads] = useState<Array<{ id: number; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    student_id: '',
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
    fee_head: 'Other Charges',
    remarks: '',
    discount: '',
  });

  useEffect(() => {
    fetch('/api/fees/categories?is_active=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setHeads(data.data || []);
      });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/fees/misc-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: form.student_id,
          amount_paid: form.amount,
          payment_date: form.payment_date,
          payment_method: form.payment_method,
          fee_head: form.fee_head,
          remarks: form.remarks,
          discount_applied: form.discount || 0,
          academic_year: academicYear,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        await alert(data.error || 'Failed to save receipt', { title: 'Error', type: 'error' });
        return;
      }
      await alert(`Receipt ${data.data.receipt_number} recorded`, { title: 'Success', type: 'success' });
      setForm((prev) => ({ ...prev, student_id: '', amount: '', remarks: '', discount: '' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <FeesPageHeader title="Misc Fees Receipt" description="Collect one-off charges that are not part of the regular fee plan." />
      <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <StudentPickSelect value={form.student_id} onChange={(student_id) => setForm((prev) => ({ ...prev, student_id }))} />
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={form.fee_head}
            onChange={(e) => setForm((prev) => ({ ...prev, fee_head: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
          >
            <option value="Other Charges">Other Charges</option>
            {heads.map((head) => (
              <option key={head.id} value={head.name}>
                {head.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            placeholder="Amount"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            required
            value={form.payment_date}
            onChange={(e) => setForm((prev) => ({ ...prev, payment_date: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <select
            value={form.payment_method}
            onChange={(e) => setForm((prev) => ({ ...prev, payment_method: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
          >
            <option value="cash">Cash</option>
            <option value="online">Online</option>
            <option value="upi">UPI</option>
            <option value="cheque">Cheque</option>
            <option value="card">Card</option>
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.discount}
            onChange={(e) => setForm((prev) => ({ ...prev, discount: e.target.value }))}
            placeholder="Discount"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={form.remarks}
          onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
          placeholder="Remarks"
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving || !form.student_id}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Receipt'}
        </button>
      </form>
    </div>
  );
}
