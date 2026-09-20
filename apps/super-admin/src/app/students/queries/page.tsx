'use client';

import { useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import StudentInteractionsPanel from '@/features/students/components/StudentInteractionsPanel';
import {
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPES,
  type InteractionType,
} from '@/lib/student-operations-utils';

export default function QueriesPage() {
  const [type, setType] = useState<InteractionType>('query');

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-lg font-medium text-gray-900">Queries / Calls / PM</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record queries, calls, principal meets, and counselling sessions.
          </p>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {INTERACTION_TYPES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`rounded-lg px-3 py-2 text-sm ${
                type === value ? 'bg-primary-600 text-white' : 'border bg-white text-gray-700'
              }`}
            >
              {INTERACTION_TYPE_LABELS[value]}
            </button>
          ))}
        </div>
        <StudentInteractionsPanel lockedType={type} showTypeFilter={false} />
      </div>
    </DashboardLayout>
  );
}
