'use client';

import LibrarySectionHub from '@/features/library/components/LibrarySectionHub';

export default function CirculationPage() {
  return (
    <LibrarySectionHub
      title="Circulation"
      description="Issue, return, renew and reserve books for students and staff."
      cards={[
        { href: '/library/students/issue', title: 'Student Issue', description: 'Issue copies to students' },
        { href: '/library/students/return', title: 'Student Return', description: 'Return student copies' },
        { href: '/library/staff/issue', title: 'Staff Issue', description: 'Issue copies to staff' },
        { href: '/library/staff/return', title: 'Staff Return', description: 'Return staff copies' },
        { href: '/library/circulation/renewals', title: 'Renewals', description: 'Extend due dates for issued copies', soon: true },
        { href: '/library/circulation/reservations', title: 'Reservations', description: 'Hold titles for members', soon: true },
      ]}
    />
  );
}
