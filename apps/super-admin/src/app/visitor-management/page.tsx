'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import VisitorManagementView from '@/features/visitors/components/VisitorManagementView';
import { FiUserCheck } from 'react-icons/fi';

export default function VisitorManagementPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
              <FiUserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl text-gray-900">Visitor Management</h1>
              <p className="text-gray-600 mt-1">
                Record visitor check-ins at the gate and send text notifications to hosts.
              </p>
            </div>
          </div>
        </div>
        <VisitorManagementView />
      </div>
    </DashboardLayout>
  );
}
