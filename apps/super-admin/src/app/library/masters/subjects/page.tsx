'use client';

import LibraryNameMaster from '@/features/library/components/LibraryNameMaster';

export default function BookSubjectMasterPage() {
  return (
    <LibraryNameMaster
      title="Subjects"
      description="Classify titles by subject for catalog and reports."
      endpoint="/api/library/masters/subjects"
      placeholder="Subject name"
    />
  );
}
