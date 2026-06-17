'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/shared/SettingsContext';
import FeeStructuresPanel from '@/features/fees/components/FeeStructuresPanel';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';

export default function FeeStructuresPage() {
  const { settings } = useSettings();
  const [structures, setStructures] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const fetchStructures = async () => {
    setLoading(true);
    try {
      const yearParam = settings.academic_year
        ? `academic_year=${encodeURIComponent(settings.academic_year)}&`
        : '';
      const res = await fetch(`/api/fees/structures?${yearParam}_t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success) setStructures(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, [settings.academic_year]);

  return (
    <div className="p-6 space-y-4">
      <FeesPageHeader
        title="Fee Structures"
        description={`Configure monthly and annual charges per class for ${settings.academic_year || 'current year'}.`}
      />
      {loading ? (
        <div className="py-16 text-center text-gray-500">Loading structures...</div>
      ) : (
        <FeeStructuresPanel feeStructures={structures} onRefresh={fetchStructures} />
      )}
    </div>
  );
}
