'use client';

import { useState } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiTrash2, FiUserCheck, FiZap } from 'react-icons/fi';
import { useSettings } from '@/shared/SettingsContext';
import { useDialog } from '@/shared/context/DialogContext';
import { useFeesStudents } from '@/features/fees/hooks/useFeesStudents';

export default function FeesOperationsPanel() {
  const { settings } = useSettings();
  const { alert, confirm } = useDialog();
  const { students, refresh: refreshStudents } = useFeesStudents(settings.academic_year);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteAllFees, setDeleteAllFees] = useState(false);

  const year = settings.academic_year || new Date().getFullYear().toString();

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const operations = [
    {
      id: 'generate',
      title: 'Generate Monthly Fees',
      description: 'Assign fees for current and next 2 months to all active students.',
      icon: FiZap,
      action: async () => {
        const ok = await confirm(
          `Generate monthly fees for all ${students.length} students?`,
          { title: 'Generate Fees', type: 'info' },
        );
        if (!ok) return;
        const currentMonth = new Date().getMonth() + 1;
        const months = [currentMonth, currentMonth + 1, currentMonth + 2].filter((m) => m <= 12);
        const res = await fetch('/api/fees/assign-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ academic_year: year, months }),
        });
        const data = await res.json();
        if (data.success) {
          await alert(
            `Assigned ${data.data.feesAssigned} fee records to ${data.data.studentsProcessed} students.`,
            { title: 'Success', type: 'success' },
          );
          refreshStudents();
        } else {
          await alert(data.error, { title: 'Error', type: 'error' });
        }
      },
    },
    {
      id: 'auto-assign',
      title: 'Auto Assign Fees',
      description: 'Run full auto-assignment based on class fee structures.',
      icon: FiUserCheck,
      action: async () => {
        const ok = await confirm('Run auto-assign for all students?', { title: 'Auto Assign' });
        if (!ok) return;
        const res = await fetch('/api/fees/auto-assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ academic_year: year }),
        });
        const data = await res.json();
        if (data.success) {
          await alert(data.message || 'Auto-assign completed', { title: 'Success', type: 'success' });
          refreshStudents();
        } else {
          await alert(data.error, { title: 'Error', type: 'error' });
        }
      },
    },
    {
      id: 'assign-missing',
      title: 'Assign Missing Fees',
      description: 'Create fee records only for students who have none assigned.',
      icon: FiUserCheck,
      action: async () => {
        const res = await fetch('/api/fees/assign-missing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ academic_year: year }),
        });
        const data = await res.json();
        if (data.success) {
          await alert(
            data.data.studentsProcessed === 0
              ? 'All students already have fees assigned.'
              : `Assigned fees to ${data.data.studentsProcessed} students.`,
            { title: 'Done', type: 'info' },
          );
          refreshStudents();
        } else {
          await alert(data.error, { title: 'Error', type: 'error' });
        }
      },
    },
    {
      id: 'reconcile',
      title: 'Fee Reconciliation',
      description: 'Reconcile payments with fee records across the school.',
      icon: FiRefreshCw,
      action: async () => {
        const ok = await confirm('Run payment reconciliation?', { title: 'Reconciliation' });
        if (!ok) return;
        const res = await fetch('/api/fees/payment-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'universal_reconciliation', academicYear: year }),
        });
        const data = await res.json();
        if (data.success) {
          await alert('Reconciliation completed', { title: 'Success', type: 'success' });
        } else {
          await alert(data.error || 'Reconciliation failed', { title: 'Error', type: 'error' });
        }
      },
    },
    {
      id: 'cleanup',
      title: 'Cleanup Orphan Records',
      description: 'Remove fee records that no longer match active structures.',
      icon: FiTrash2,
      action: async () => {
        const ok = await confirm('Remove orphaned fee records?', { title: 'Cleanup', type: 'warning' });
        if (!ok) return;
        const res = await fetch('/api/fees/auto-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cleanup_orphaned', academicYear: year }),
        });
        const data = await res.json();
        if (data.success) {
          await alert('Cleanup completed', { title: 'Success', type: 'success' });
        } else {
          await alert(data.error || 'Cleanup failed', { title: 'Error', type: 'error' });
        }
      },
    },
  ];

  const handleClearPayments = async () => {
    const ok = await confirm(
      'This will permanently delete all payment records. This cannot be undone.',
      { title: 'Clear All Payments', type: 'danger' },
    );
    if (!ok) return;

    setBusy('clear');
    try {
      const res = await fetch('/api/fees/clear-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAllFees }),
      });
      const data = await res.json();
      if (data.success) {
        await alert(
          deleteAllFees
            ? `Deleted ${data.data.paymentsDeleted} payments and ${data.data.feesDeleted} fee records.`
            : `Cleared ${data.data.paymentsDeleted} payments.`,
          { title: 'Success', type: 'success' },
        );
        refreshStudents();
      } else {
        await alert(data.error, { title: 'Error', type: 'error' });
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {operations.map((op) => (
          <div
            key={op.id}
            className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <op.icon size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{op.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{op.description}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run(op.id, op.action)}
              className="mt-auto self-start px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {busy === op.id ? 'Running...' : 'Run'}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
          <FiAlertTriangle />
          Danger Zone
        </div>
        <p className="text-sm text-red-700 mb-4">
          Clear all payment records. Use only for testing or data reset.
        </p>
        <label className="flex items-center gap-2 text-sm text-red-800 mb-4">
          <input
            type="checkbox"
            checked={deleteAllFees}
            onChange={(e) => setDeleteAllFees(e.target.checked)}
            className="rounded border-red-300"
          />
          Also delete all fee assignments (student_fees)
        </label>
        <button
          type="button"
          disabled={busy !== null}
          onClick={handleClearPayments}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {busy === 'clear' ? 'Clearing...' : 'Clear All Payments'}
        </button>
      </div>
    </div>
  );
}
