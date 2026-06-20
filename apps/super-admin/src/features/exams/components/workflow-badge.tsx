'use client';

import type { ResultWorkflowStatus } from '@/lib/ensure-exam-result-engine';

const BADGE_STYLES: Record<ResultWorkflowStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  under_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
};

const LABELS: Record<ResultWorkflowStatus, string> = {
  draft: 'Draft',
  under_review: 'Under Review',
  approved: 'Approved',
  published: 'Published',
};

export default function WorkflowBadge({ status }: { status?: ResultWorkflowStatus | string | null }) {
  const value = (status || 'draft') as ResultWorkflowStatus;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${BADGE_STYLES[value] || BADGE_STYLES.draft}`}
    >
      {LABELS[value] || value.replace(/_/g, ' ')}
    </span>
  );
}

export { BADGE_STYLES, LABELS };
