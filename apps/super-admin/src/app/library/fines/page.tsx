'use client';

import LibrarySectionHub from '@/features/library/components/LibrarySectionHub';

export default function LibraryFinesPage() {
  return (
    <LibrarySectionHub
      title="Fines"
      description="Pending overdue fines, collection, and fine history."
      cards={[
        { href: '/library/fines/pending', title: 'Pending Fines', description: 'Overdue copies that may attract a fine' },
        { href: '/library/fines/collection', title: 'Fine Collection', description: 'Record fine payments', soon: true },
        { href: '/library/fines/history', title: 'Fine History', description: 'Circulation records with a fine amount' },
      ]}
    />
  );
}
