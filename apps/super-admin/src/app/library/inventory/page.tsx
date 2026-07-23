'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';

export default function InventoryPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Inventory</h1>
          {/* <p className="text-gray-500">Stock verification, missing books and write-offs.</p> */}
        </div>
        {/* <p className="text-gray-500">Stock verification, missing books and write-offs.</p> */}
      </div>
    </DashboardLayout>
  );
}
