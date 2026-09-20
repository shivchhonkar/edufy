'use client';

import LibrarySectionHub from '@/features/library/components/LibrarySectionHub';

export default function LibraryMastersPage() {
  return (
    <LibrarySectionHub
      title="Library Masters"
      description="Catalog and configuration used across circulation and reports."
      cards={[
        { href: '/library/catalog/books', title: 'Books', description: 'Add, modify, delete and list books' },
        { href: '/library/masters/authors', title: 'Authors', description: 'Authors used on the book catalog' },
        { href: '/library/masters/publishers', title: 'Publishers', description: 'Publishers used on the book catalog' },
        { href: '/library/masters/subjects', title: 'Subjects', description: 'Subjects / classification for titles' },
        { href: '/library/masters/vendors', title: 'Vendors', description: 'Suppliers used when purchasing books' },
        { href: '/library/masters/racks', title: 'Racks & Shelves', description: 'Physical locations for copies', soon: true },
        { href: '/library/masters/fines', title: 'Fine Rules', description: 'Loan period and overdue fine rates' },
        { href: '/library/masters/categories', title: 'Categories', description: 'Book categories' },
      ]}
    />
  );
}
