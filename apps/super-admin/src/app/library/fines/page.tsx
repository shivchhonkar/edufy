'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';

export default function FinesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 min-w-0">
        <div>
        <h1 className="text-lg font-medium text-gray-900">Fine Management</h1>
          {/* <p className="text-gray-500">Fine rules, collection and outstanding fines will be managed here.</p> */}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fine Rules <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter fine rules"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
