'use client';

import InventoryNameMaster from '@/features/inventory/components/InventoryNameMaster';

export default function InventoryCategoriesPage() {
  return (
    <div className="space-y-8">
      <InventoryNameMaster
        title="Category Master"
        description="Group items for stock, purchase and reports."
        endpoint="/api/inventory/masters/categories"
        extraFields={[{ key: 'description', placeholder: 'Description' }]}
      />
    </div>
  );
}
