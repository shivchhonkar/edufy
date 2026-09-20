'use client';

import LibrarySectionHub from '@/features/library/components/LibrarySectionHub';

export default function LibraryReportsPage() {
  return (
    <LibrarySectionHub
      title="Library Reports"
      description="Stock, circulation, overdue, student and staff reports."
      cards={[
        { href: '/library/reports/stock', title: 'Stock Report', description: 'Title-wise available and issued copies' },
        { href: '/library/reports/issue', title: 'Issue Report', description: 'Books issued in the selected period' },
        { href: '/library/reports/return', title: 'Return Report', description: 'Books returned in the selected period' },
        { href: '/library/reports/overdue', title: 'Overdue Report', description: 'Issued copies past their due date' },
        { href: '/library/reports/students', title: 'Student Report', description: 'Student circulation history' },
        { href: '/library/reports/staff', title: 'Staff Report', description: 'Staff circulation history' },
      ]}
    />
  );
}
