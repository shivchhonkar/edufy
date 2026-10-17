'use client';

import { useState } from 'react';
import { FiPrinter } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import StudentInteractionsPanel from '@/features/students/components/StudentInteractionsPanel';
import { printHtmlDocument } from '@/features/students/utils/print-html';
import {
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPES,
  type InteractionType,
} from '@/lib/student-operations-utils';

export default function InteractionsPage() {
  const [type, setType] = useState<InteractionType | ''>('');

  const printReport = async () => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    const res = await fetch(`/api/students/interactions?${params}`);
    const data = await res.json();
    const rows = data.success ? data.data : [];
    printHtmlDocument(
      'Interactions & Counselling',
      `<h1>Interactions & Counselling</h1>
       <p class="muted">${type ? INTERACTION_TYPE_LABELS[type] : 'All types'}</p>
       <table>
         <thead><tr><th>Date</th><th>Type</th><th>Student</th><th>Subject</th><th>Status</th></tr></thead>
         <tbody>
           ${rows
             .map(
               (row: {
                 interaction_date: string;
                 interaction_type: InteractionType;
                 student_name?: string;
                 subject: string;
                 status: string;
               }) =>
                 `<tr><td>${row.interaction_date?.slice(0, 10)}</td><td>${
                   INTERACTION_TYPE_LABELS[row.interaction_type]
                 }</td><td>${row.student_name || ''}</td><td>${row.subject}</td><td>${row.status}</td></tr>`
             )
             .join('')}
         </tbody>
       </table>`
    );
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Interactions & Counselling</h1>
            <p className="mt-1 text-sm text-gray-500">
              Record and print queries, calls, principal meets, and counselling sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={printReport}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"
          >
            <FiPrinter /> Print
          </button>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setType('')}
            className={`rounded-lg px-3 py-2 text-sm ${
              !type ? 'bg-primary-600 text-white' : 'border bg-white text-gray-700'
            }`}
          >
            All
          </button>
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
