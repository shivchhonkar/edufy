'use client';

import { useState } from 'react';
import { FiPlus, FiStar, FiTrash2 } from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';
import type { LookupListConfig } from '@/lib/student-lookup-settings';

const INPUT =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none';

interface StudentLookupListCardProps {
  title: string;
  description: string;
  placeholder: string;
  list: LookupListConfig;
  onChange: (next: LookupListConfig) => void;
}

export default function StudentLookupListCard({
  title,
  description,
  placeholder,
  list,
  onChange,
}: StudentLookupListCardProps) {
  const { confirm } = useDialog();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const addItem = () => {
    const value = draft.trim();
    if (!value) {
      setError('Enter a value to add');
      return;
    }
    if (value.length > 100) {
      setError('Value must be 100 characters or less');
      return;
    }
    if (list.items.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setError('This value already exists');
      return;
    }
    onChange({
      items: [...list.items, value],
      default_value: list.default_value || value,
    });
    setDraft('');
    setError('');
  };

  const removeItem = async (value: string) => {
    if (list.items.length <= 1) {
      setError('Keep at least one value');
      return;
    }

    const isDefault = value === list.default_value;
    const confirmed = await confirm(
      isDefault
        ? `Delete ${title.toLowerCase()} "${value}"? This is the current default, so another value will become the default.`
        : `Delete ${title.toLowerCase()} "${value}"? This cannot be undone unless you add it again.`,
      {
        title: `Delete ${title}`,
        type: 'danger',
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    );
    if (!confirmed) return;

    const items = list.items.filter((item) => item !== value);
    const default_value = list.default_value === value ? items[0] : list.default_value;
    onChange({ items, default_value });
    setError('');
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-gray-600">Default value</span>
        <select
          className={`${INPUT} bg-white`}
          value={list.default_value}
          onChange={(e) => onChange({ ...list, default_value: e.target.value })}
        >
          {list.items.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <div className="mb-3 divide-y divide-gray-100 rounded-lg border border-gray-100">
        {list.items.map((item) => {
          const isDefault = item === list.default_value;
          return (
            <div key={item} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm text-gray-900">{item}</span>
                {isDefault && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                    <FiStar size={10} />
                    Default
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeItem(item)}
                disabled={list.items.length <= 1}
                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Remove ${item}`}
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          className={INPUT}
        />
        <button
          type="button"
          onClick={addItem}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <FiPlus size={16} />
          Add
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
