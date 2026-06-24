'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ViewStaffModal from '@/features/staff/components/ViewStaffModal';
import VirtualizedStaffDocumentsTable from '@/features/staff/components/VirtualizedStaffDocumentsTable';
import type { StaffListItem } from '@/features/staff/components/VirtualizedStaffTable';
import { Staff } from '@/shared/types';
import { FiArrowLeft, FiFolder, FiSearch } from 'react-icons/fi';

const STAFF_FETCH_LIMIT = 5000;

export default function StaffDocumentsPage() {
  const [staff, setStaff] = useState<StaffListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        limit: String(STAFF_FETCH_LIMIT),
        page: '1',
        status: 'active',
      });
      const res = await fetch(`/api/staff?${params}`);
      const data = await res.json();
      if (data.success) setStaff(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <Link
            href="/staff"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <FiArrowLeft size={14} /> Back to Staff
          </Link>
          <h1 className="flex items-center gap-2 text-xl text-gray-900">
            <FiFolder className="text-primary-600" />
            Staff Documents
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Upload and manage documents for each staff member.
          </p>
        </div>

        <div className="relative max-w-md">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or employee ID..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
            </div>
          ) : (
            <VirtualizedStaffDocumentsTable
              staff={staff}
              onManageDocuments={setViewingStaff}
            />
          )}
        </div>
      </div>

      <ViewStaffModal
        isOpen={!!viewingStaff}
        onClose={() => setViewingStaff(null)}
        staff={viewingStaff}
        initialTab="documents"
      />
    </DashboardLayout>
  );
}
