'use client';

import { formatFeeCurrency } from '@/features/fees/utils/fees-format';
import {
  getOtherFeeCategoryLabel,
  type OtherFeeCategory,
} from '@/features/fees/utils/fee-type-classification';
import type { CollectibleFeeItem } from '@/features/fees/utils/build-collectible-other-fees';

interface OtherFeesPanelProps {
  items: CollectibleFeeItem[];
  onChange: (items: CollectibleFeeItem[]) => void;
}

const CATEGORY_ORDER: OtherFeeCategory[] = ['registration', 'annual', 'monthly'];

export default function OtherFeesPanel({ items, onChange }: OtherFeesPanelProps) {
  if (items.length === 0) return null;

  const toggleItem = (key: string) => {
    onChange(
      items.map((item) =>
        item.key === key ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  const toggleCategory = (category: OtherFeeCategory) => {
    const categoryItems = items.filter((item) => item.category === category);
    const allSelected = categoryItems.every((item) => item.selected);
    onChange(
      items.map((item) =>
        item.category === category ? { ...item, selected: !allSelected } : item,
      ),
    );
  };

  const selectAll = () => {
    const allSelected = items.every((item) => item.selected);
    onChange(items.map((item) => ({ ...item, selected: !allSelected })));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          Registration, Annual &amp; Activity Fees
        </h3>
        <button
          type="button"
          onClick={selectAll}
          className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200"
        >
          {items.every((item) => item.selected) ? 'Clear All' : 'Select All'}
        </button>
      </div>

      {CATEGORY_ORDER.map((category) => {
        const categoryItems = items.filter((item) => item.category === category);
        if (categoryItems.length === 0) return null;

        return (
          <div
            key={category}
            className="border border-gray-200 rounded-lg overflow-hidden bg-white"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-800">
                {getOtherFeeCategoryLabel(category)}
              </span>
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                {categoryItems.every((item) => item.selected) ? 'Clear' : 'Select all'}
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {categoryItems.map((item) => (
                <label
                  key={item.key}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${
                    item.selected ? 'bg-primary-50/50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleItem(item.key)}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.fee_type}</p>
                    {item.subtitle && (
                      <p className="text-xs text-gray-500">{item.subtitle}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatFeeCurrency(item.outstanding)}
                    </p>
                    {item.amount_paid > 0 && (
                      <p className="text-xs text-gray-500">
                        Paid {formatFeeCurrency(item.amount_paid)}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
