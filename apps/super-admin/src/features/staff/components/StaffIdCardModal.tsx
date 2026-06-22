'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import StaffIdCard, { type StaffIdCardSchoolInfo } from './StaffIdCard';
import type { StaffListItem } from './VirtualizedStaffTable';
import { FiPrinter, FiX } from 'react-icons/fi';

interface StaffIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffListItem | null;
  school: StaffIdCardSchoolInfo;
}

export default function StaffIdCardModal({
  isOpen,
  onClose,
  staff,
  school,
}: StaffIdCardModalProps) {
  if (!staff) return null;

  const handlePrint = () => {
    requestAnimationFrame(() => {
      setTimeout(() => window.print(), 200);
    });
  };

  const staffName = `${staff.first_name} ${staff.last_name}`.trim();

  return (
    <>
      <AppModal open={isOpen} onClose={onClose}>
        <div className={APP_MODAL_PANEL}>
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 print:hidden">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Staff ID Card</h2>
              <p className="text-sm text-gray-500">{staffName}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
              >
                <FiPrinter size={16} />
                Print
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close preview"
              >
                <FiX size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 print:overflow-visible print:p-0">
            <div
              id="staff-id-cards-print-root"
              className="staff-id-cards-grid flex flex-wrap justify-center gap-4"
            >
              <StaffIdCard staff={staff} school={school} />
            </div>
          </div>
        </div>
      </AppModal>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #staff-id-cards-print-root,
          #staff-id-cards-print-root * {
            visibility: visible;
          }
          #staff-id-cards-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .staff-id-cards-grid {
            display: flex !important;
            justify-content: center;
          }
          .staff-id-card-sheet {
            page-break-inside: avoid;
          }
          .staff-id-card {
            box-shadow: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
        }
      `}</style>
    </>
  );
}
