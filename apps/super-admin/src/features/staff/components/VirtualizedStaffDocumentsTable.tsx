'use client';

import { useMemo } from 'react';
import { FiFolder } from 'react-icons/fi';
import VirtualizedTable, {
  type VirtualizedTableColumn,
} from '@/shared/components/common/VirtualizedTable';
import type { StaffListItem } from '@/features/staff/components/VirtualizedStaffTable';
import { staffDisplayName, staffRoleLine } from '@/features/staff/components/VirtualizedStaffTable';
import { Staff } from '@/shared/types';

type StaffRow = StaffListItem & { srNo: number };

interface VirtualizedStaffDocumentsTableProps {
  staff: StaffListItem[];
  onManageDocuments: (member: Staff) => void;
}

export default function VirtualizedStaffDocumentsTable({
  staff,
  onManageDocuments,
}: VirtualizedStaffDocumentsTableProps) {
  const rows = useMemo<StaffRow[]>(
    () => staff.map((member, index) => ({ ...member, srNo: index + 1 })),
    [staff],
  );

  const columns = useMemo<VirtualizedTableColumn<StaffRow>[]>(
    () => [
      {
        key: 'srNo',
        header: 'S.R.',
        width: '4.5rem',
        render: (member) => (
          <span className="text-sm text-gray-600 tabular-nums">{member.srNo}</span>
        ),
      },
      {
        key: 'staff',
        header: 'Staff',
        width: 'minmax(220px, 2fr)',
        render: (member) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{staffDisplayName(member)}</p>
            <p className="truncate text-xs text-gray-500">{staffRoleLine(member)}</p>
          </div>
        ),
      },
      {
        key: 'employeeId',
        header: 'Employee ID',
        width: '8rem',
        render: (member) => (
          <span className="text-sm font-medium text-gray-900">{member.employee_id}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Documents',
        width: '11rem',
        headerClassName: 'text-right whitespace-nowrap',
        cellClassName: 'justify-end',
        render: (member) => (
          <button
            type="button"
            onClick={() => onManageDocuments(member)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
          >
            <FiFolder size={14} />
            Manage
          </button>
        ),
      },
    ],
    [onManageDocuments],
  );

  return (
    <VirtualizedTable
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      rowHeight={56}
      maxHeight="calc(100vh - 320px)"
      minWidth={720}
      emptyMessage="No staff members found."
      rowClassName="hover:bg-gray-50/80"
    />
  );
}
