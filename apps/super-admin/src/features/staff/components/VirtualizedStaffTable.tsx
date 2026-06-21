'use client';

import { useMemo } from 'react';
import { FiEdit, FiEye, FiTrash2 } from 'react-icons/fi';
import VirtualizedTable, {
  type VirtualizedTableColumn,
} from '@/shared/components/common/VirtualizedTable';
import { Staff } from '@/shared/types';

export type StaffListItem = Staff & {
  department_name?: string | null;
  designation_name?: string | null;
};

type StaffRow = StaffListItem & { srNo: number };

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-yellow-100 text-yellow-800',
  resigned: 'bg-blue-100 text-blue-800',
  terminated: 'bg-red-100 text-red-800',
};

function staffDisplayName(member: StaffListItem) {
  return `${member.first_name} ${member.last_name}`.trim();
}

function staffRoleLine(member: StaffListItem) {
  const designation = member.designation_name || member.designation;
  const department = member.department_name || member.department;
  if (designation && department) return `${designation} · ${department}`;
  return designation || department || '—';
}

interface VirtualizedStaffTableProps {
  staff: StaffListItem[];
  onView: (member: Staff) => void;
  onEdit: (member: Staff) => void;
  onDelete: (member: Staff) => void;
}

export default function VirtualizedStaffTable({
  staff,
  onView,
  onEdit,
  onDelete,
}: VirtualizedStaffTableProps) {
  const rows = useMemo<StaffRow[]>(
    () => staff.map((member, index) => ({ ...member, srNo: index + 1 })),
    [staff],
  );

  const columns = useMemo<VirtualizedTableColumn<StaffRow>[]>(
    () => [
      {
        key: 'srNo',
        header: 'S.R. No',
        width: '4.5rem',
        headerClassName: 'text-left whitespace-nowrap',
        cellClassName: 'text-left',
        render: (member) => (
          <span className="text-sm text-gray-600 tabular-nums">{member.srNo}</span>
        ),
      },
      {
        key: 'staff',
        header: 'Staff',
        width: 'minmax(220px, 2fr)',
        render: (member) => (
          <div className="flex items-center gap-2.5 min-w-0 w-full">
            {member.photo_url ? (
              <img
                src={member.photo_url}
                alt={staffDisplayName(member)}
                className="h-8 w-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-gray-600">
                  {member.first_name.charAt(0)}
                  {member.last_name.charAt(0)}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {staffDisplayName(member)}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {member.employee_id}
                {member.email ? ` · ${member.email}` : member.phone ? ` · ${member.phone}` : ''}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'designation',
        header: 'Designation',
        width: 'minmax(120px, 1fr)',
        render: (member) => (
          <span className="text-sm text-gray-600 truncate">
            {member.designation_name || member.designation || '—'}
          </span>
        ),
      },
      {
        key: 'department',
        header: 'Department',
        width: 'minmax(120px, 1fr)',
        render: (member) => (
          <span className="text-sm text-gray-600 truncate">
            {member.department_name || member.department || '—'}
          </span>
        ),
      },
      {
        key: 'phone',
        header: 'Phone',
        width: '7rem',
        render: (member) => (
          <span className="text-sm text-gray-600 whitespace-nowrap">{member.phone}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        width: '6.5rem',
        render: (member) => (
          <span
            className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full capitalize whitespace-nowrap ${
              STATUS_STYLES[member.status] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {member.status}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '7rem',
        headerClassName: 'text-right whitespace-nowrap',
        cellClassName: 'justify-end',
        render: (member) => (
          <div className="flex items-center justify-end gap-0.5">
            <button
              type="button"
              onClick={() => onView(member)}
              className="p-1.5 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded"
              title="View Details"
            >
              <FiEye size={16} />
            </button>
            <button
              type="button"
              onClick={() => onEdit(member)}
              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
              title="Edit"
            >
              <FiEdit size={16} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(member)}
              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
              title="Delete"
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        ),
      },
    ],
    [onView, onEdit, onDelete],
  );

  return (
    <VirtualizedTable
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      rowHeight={64}
      maxHeight="calc(100vh - 260px)"
      minWidth={960}
      emptyMessage='No staff members found. Click "Add Staff" to get started.'
      rowClassName="hover:bg-gray-50/80"
    />
  );
}

export { staffDisplayName, staffRoleLine };
