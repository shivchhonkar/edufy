'use client';

import InventoryNameMaster from '@/features/inventory/components/InventoryNameMaster';

export default function InventoryUnitsPage() {
  return (
    <InventoryNameMaster
      title="Unit Master"
      description="Units of measure used on items and documents."
      endpoint="/api/inventory/masters/units"
      extraFields={[{ key: 'remarks', placeholder: 'Remarks' }]}
    />
  );
}
