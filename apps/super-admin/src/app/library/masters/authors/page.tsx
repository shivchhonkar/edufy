'use client';

import LibraryNameMaster from '@/features/library/components/LibraryNameMaster';

export default function AuthorMasterPage() {
  return (
    <LibraryNameMaster
      title="Authors"
      description="Add, modify, delete and list authors used on Books."
      endpoint="/api/library/masters/authors"
      placeholder="Author name"
    />
  );
}
