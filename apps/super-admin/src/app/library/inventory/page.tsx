'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';

export default function InventoryPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Inventory</h1>
        <p className="text-gray-500">Stock verification, missing books and write-offs.</p>
      </div>
    </DashboardLayout>
  );
}
