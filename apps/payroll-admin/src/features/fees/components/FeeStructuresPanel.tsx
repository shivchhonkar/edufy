'use client';

import { useMemo, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import { compareClassNames } from '@/lib/class-sort';
import { useDialog } from '@/shared/context/DialogContext';
import AddFeeStructureModal from '@/features/fees/components/AddFeeStructureModal';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';

interface FeeStructuresPanelProps {
  feeStructures: Array<Record<string, unknown>>;
  onRefresh: () => void;
}

export default function FeeStructuresPanel({ feeStructures, onRefresh }: FeeStructuresPanelProps) {
  const { alert, confirm } = useDialog();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, Array<Record<string, unknown>>> = {};
    for (const s of feeStructures) {
      const key = String(s.class_name || 'All Classes');
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    const sortedKeys = Object.keys(map).sort((a, b) => {
      if (a === 'All Classes') return -1;
      if (b === 'All Classes') return 1;
      return compareClassNames(a, b);
    });
    return { map, sortedKeys };
  }, [feeStructures]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDelete = async (structure: Record<string, unknown>) => {
    const ok = await confirm(`Delete "${structure.fee_type}" fee structure?`, {
      title: 'Delete Fee Structure',
      type: 'warning',
    });
    if (!ok) return;

    setDeletingId(Number(structure.id));
    try {
      const res = await fetch(`/api/fees/structures?id=${structure.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await alert('Fee structure deleted', { title: 'Success', type: 'success' });
        onRefresh();
      } else {
        await alert(data.error || 'Failed to delete', { title: 'Error', type: 'error' });
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (feeStructures.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600">No fee structures configured</p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"
        >
          <FiPlus size={16} />
          Add Fee Structure
        </button>
        <AddFeeStructureModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSuccess={() => {
            onRefresh();
            setShowModal(false);
            setEditing(null);
          }}
          editingFeeStructure={editing}
          feeStructures={feeStructures}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          <FiPlus size={16} />
          Add Structure
        </button>
      </div>

      {grouped.sortedKeys.map((className) => {
        const items = grouped.map[className];
        const monthly = items.filter((s) => s.frequency === 'monthly');
        const annual = items.filter((s) => s.frequency !== 'monthly');
        const monthlyTotal = monthly
          .filter((s) => s.is_active)
          .reduce((sum, s) => sum + parseFloat(String(s.amount || 0)), 0);
        const annualTotal = annual
          .filter((s) => s.is_active)
          .reduce((sum, s) => sum + parseFloat(String(s.amount || 0)), 0);
        const isOpen = expanded.has(className);

        return (
          <div key={className} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(className)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 bg-gradient-to-r from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100 text-left"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{className}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Monthly total: {formatFeeCurrency(monthlyTotal)} · Annual total:{' '}
                  {formatFeeCurrency(annualTotal)}
                </p>
              </div>
              {isOpen ? <FiChevronUp /> : <FiChevronDown />}
            </button>

            {isOpen && (
              <div className="p-5 space-y-6 border-t border-gray-100">
                <FeeGroup title="Monthly Charges" items={monthly} onEdit={(s) => { setEditing(s); setShowModal(true); }} onDelete={handleDelete} deletingId={deletingId} />
                <FeeGroup title="Annual Charges" items={annual} onEdit={(s) => { setEditing(s); setShowModal(true); }} onDelete={handleDelete} deletingId={deletingId} />
              </div>
            )}
          </div>
        );
      })}

      <AddFeeStructureModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        onSuccess={() => {
          onRefresh();
          setShowModal(false);
          setEditing(null);
        }}
        editingFeeStructure={editing}
        feeStructures={feeStructures}
      />
    </div>
  );
}

function FeeGroup({
  title,
  items,
  onEdit,
  onDelete,
  deletingId,
}: {
  title: string;
  items: Array<Record<string, unknown>>;
  onEdit: (s: Record<string, unknown>) => void;
  onDelete: (s: Record<string, unknown>) => void;
  deletingId: number | null;
}) {
  if (items.length === 0) {
    return (
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>
        <p className="text-sm text-gray-400 italic">None configured</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={String(item.id)}
            className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-gray-100 bg-gray-50"
          >
            <div>
              <p className="font-medium text-gray-900">{String(item.fee_type)}</p>
              <p className="text-sm text-gray-500">
                {formatFeeCurrency(item.amount as number)} · {String(item.category_name || '—')}
                {!item.is_active && (
                  <span className="ml-2 text-red-600 text-xs">(Inactive)</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                aria-label="Edit"
              >
                <FiEdit2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(item)}
                disabled={deletingId === Number(item.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                aria-label="Delete"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
