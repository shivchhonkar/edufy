'use client';

import LibraryNameMaster from '@/features/library/components/LibraryNameMaster';

export default function PublisherMasterPage() {
  return (
    <LibraryNameMaster
      title="Publishers"
      description="Add, modify, delete and list publishers used on Books."
      endpoint="/api/library/masters/publishers"
      placeholder="Publisher name"
    />
  );
}
