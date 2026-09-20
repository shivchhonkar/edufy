'use client';

import LibrarySectionHub from '@/features/library/components/LibrarySectionHub';

export default function LibraryRegistersPage() {
  return (
    <LibrarySectionHub
      title="Registers"
      description="Day-to-day library registers for copies, issues, returns and exceptions."
      cards={[
        { href: '/library/reports/books', title: 'Book Register', description: 'Accession-wise catalog of every copy' },
        { href: '/library/reports/issue-return', title: 'Issue & Return Register', description: 'All issues and returns with dates and fines' },
        { href: '/library/reports/issued', title: 'Issued Books', description: 'Copies currently out with students or staff' },
        { href: '/library/registers/overdue', title: 'Overdue Books', description: 'Issued copies past their due date' },
        { href: '/library/registers/lost', title: 'Lost / Damaged Books', description: 'Copies marked lost or damaged' },
      ]}
    />
  );
}
