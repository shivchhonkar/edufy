'use client';

import InventoryNameMaster from '@/features/inventory/components/InventoryNameMaster';

export default function InventoryLocationsPage() {
  return (
    <InventoryNameMaster
      title="Stores / Locations"
      description="Physical stores used for stock in, transfer and GRN."
      endpoint="/api/inventory/masters/locations"
      extraFields={[{ key: 'remarks', placeholder: 'Remarks' }]}
    />
  );
}
