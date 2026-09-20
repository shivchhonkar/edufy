'use client';

import InventoryNameMaster from '@/features/inventory/components/InventoryNameMaster';

export default function InventoryVendorsPage() {
  return (
    <InventoryNameMaster
      title="Vendor Master"
      description="Suppliers used on purchase requests, orders and GRN."
      endpoint="/api/inventory/masters/vendors"
      extraFields={[
        { key: 'contact_person', placeholder: 'Contact' },
        { key: 'phone', placeholder: 'Phone' },
        { key: 'email', placeholder: 'Email' },
        { key: 'gstin', placeholder: 'GSTIN' },
      ]}
    />
  );
}
