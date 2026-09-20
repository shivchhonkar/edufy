'use client';

import { useCallback, useEffect, useState } from 'react';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';
import { useDialog } from '@/shared/context/DialogContext';

interface OrderRow {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
  amount_rupees: string | number;
  razorpay_order_id?: string;
  payer_name?: string;
  payer_phone?: string;
  created_at: string;
  status: string;
}

export default function PendingMobileReceiptsPage() {
  const { confirm, alert } = useDialog();
  const [rows, setRows] = useState<OrderRow[]>([]);

  const load = useCallback(async () => {
    const res = await fetch('/api/fees/pending-mobile');
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = async (row: OrderRow) => {
    const ok = await confirm(`Cancel pending mobile order for ${row.first_name} ${row.last_name}?`, {
      type: 'danger',
      confirmText: 'Cancel order',
    });
    if (!ok) return;
    const res = await fetch('/api/fees/pending-mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, action: 'cancel' }),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to cancel', { title: 'Error', type: 'error' });
      return;
    }
    load();
  };

  return (
    <div className="space-y-4">
      <FeesPageHeader title="Pending Mobile Receipts" description="Parent-portal Razorpay orders that have not completed payment." />
      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Class</th>
              <th className="px-3 py-2">Payer</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">No pending mobile receipts.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    {row.first_name} {row.last_name}
                    <div className="text-xs text-gray-500">{row.admission_number}</div>
                  </td>
                  <td className="px-3 py-2">{row.class_name || '—'}</td>
                  <td className="px-3 py-2">
                    {row.payer_name || '—'}
                    <div className="text-xs text-gray-500">{row.payer_phone || ''}</div>
                  </td>
                  <td className="px-3 py-2">{row.razorpay_order_id || row.id}</td>
                  <td className="px-3 py-2 text-right">{formatFeeCurrency(row.amount_rupees)}</td>
                  <td className="px-3 py-2">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => cancel(row)} className="text-red-700 hover:underline">
                      Cancel
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
