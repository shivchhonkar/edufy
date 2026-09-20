'use client';

import { useCallback, useEffect, useState } from 'react';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import FeeSetupLinks from '@/features/fees/components/FeeSetupLinks';
import StudentPickSelect from '@/features/students/components/StudentPickSelect';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { useDialog } from '@/shared/context/DialogContext';
import { useSettings } from '@/shared/SettingsContext';

interface StudentFeeRow {
  id: number;
  fee_type?: string;
  month?: number | null;
  amount_due: string | number;
  amount_paid: string | number;
  discount_amount?: string | number;
  status: string;
}

export default function StudentWiseFeesPage() {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const { selectedAcademicYear } = useEnrollmentSession();
  const academicYear = selectedAcademicYear?.name || settings.academic_year || '';
  const [studentId, setStudentId] = useState('');
  const [rows, setRows] = useState<StudentFeeRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { amount: string; discount: string }>>({});

  const load = useCallback(async () => {
    if (!studentId) {
      setRows([]);
      return;
    }
    const params = new URLSearchParams({ student_id: studentId, academic_year: academicYear });
    const res = await fetch(`/api/fees/student-overrides?${params}`);
    const data = await res.json();
    if (!data.success) return;
    setRows(data.data || []);
    const next: Record<number, { amount: string; discount: string }> = {};
    for (const row of data.data || []) {
      next[row.id] = {
        amount: String(row.amount_due ?? ''),
        discount: String(row.discount_amount ?? 0),
      };
    }
    setDrafts(next);
  }, [studentId, academicYear]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (row: StudentFeeRow) => {
    const draft = drafts[row.id];
    const res = await fetch('/api/fees/student-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_fee_id: row.id,
        amount: draft?.amount,
        discount_amount: draft?.discount,
        fee_type: row.fee_type,
      }),
    });
    const data = await res.json();
    await alert(data.success ? 'Student fee updated' : data.error || 'Save failed', {
      title: data.success ? 'Success' : 'Error',
      type: data.success ? 'success' : 'error',
    });
    if (data.success) load();
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <FeesPageHeader title="Student-wise Fees" description="Override billed amounts for an individual student." />
      <FeeSetupLinks />
      <div className="max-w-md">
        <StudentPickSelect value={studentId} onChange={setStudentId} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!studentId ? (
          <p className="p-6 text-sm text-gray-500 text-center">Select a student to edit fee amounts.</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">No fee records for this student.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Fee</th>
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Discount</th>
                <th className="px-3 py-2">Paid</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">{row.fee_type || 'Fee'}</td>
                  <td className="px-3 py-2">{row.month || '—'}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={drafts[row.id]?.amount || ''}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [row.id]: { ...prev[row.id], amount: e.target.value } }))
                      }
                      className="w-28 rounded-lg border border-gray-200 px-2 py-1.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={drafts[row.id]?.discount || ''}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [row.id]: { ...prev[row.id], discount: e.target.value } }))
                      }
                      className="w-28 rounded-lg border border-gray-200 px-2 py-1.5"
                    />
                  </td>
                  <td className="px-3 py-2">{formatFeeCurrency(row.amount_paid)}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => save(row)} className="text-primary-700 hover:underline">
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
