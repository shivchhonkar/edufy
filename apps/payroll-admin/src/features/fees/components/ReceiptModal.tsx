'use client';

import { useState, useRef, useMemo } from 'react';
import { FiX, FiPrinter, FiDownload } from 'react-icons/fi';
import PrintableReceipt from '@/features/fees/components/PrintableReceipt';
import { useDialog } from '@/shared/context/DialogContext';
import { useSettings } from '@/shared/SettingsContext';
import { printFeeReceiptViaIframe } from '@/features/fees/utils/fee-receipt-print';
import { HTML2PDF_PAGE_MARGIN_MM } from '@edulakhya/utils';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any;
  student: any;
}

export default function ReceiptModal({ isOpen, onClose, payment, student }: ReceiptModalProps) {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const [downloading, setDownloading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const sidebarCollapsed = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  }, [isOpen]);

  const handlePrint = () => {
    printFeeReceiptViaIframe(payment, student, {
      school_name: settings.school_name,
      school_address: settings.school_address,
      school_phone: settings.school_phone,
      school_email: settings.school_email,
      logo_url: settings.logo_url,
      academic_year: settings.academic_year || payment.academic_year,
    });
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;

      const element = receiptRef.current;
      if (!element) return;

      const opt = {
        margin: HTML2PDF_PAGE_MARGIN_MM,
        filename: `Receipt_${payment.receipt_number}_${student?.first_name}_${student?.last_name}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all'] },
      };

      await html2pdf().set(opt as any).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      await alert('Failed to generate PDF. Please try again.', { title: 'Error', type: 'error' });
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed top-0 bottom-0 right-0 bg-black bg-opacity-50 z-[60] transition-all duration-300 ${
        sidebarCollapsed ? 'left-16' : 'left-56'
      }`}
      style={{ width: sidebarCollapsed ? 'calc(100% - 64px)' : 'calc(100% - 224px)' }}
    >
      <div className="bg-white shadow-2xl w-full h-full overflow-y-auto">
        <div className="px-4 py-2 sm:px-6 sm:py-3 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl text-gray-900">Payment Receipt</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="h-10 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
            >
              <FiPrinter size={18} />
              Print (A4)
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="h-10 px-4 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiDownload size={18} />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX size={28} />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 flex justify-center bg-gray-50 min-h-[calc(100vh-120px)]">
          <div
            ref={receiptRef}
            className="bg-white shadow-sm border border-gray-200 rounded-lg p-1"
            style={{ width: '210mm', maxWidth: '100%', minHeight: '297mm' }}
          >
            <PrintableReceipt payment={payment} student={student} />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 sm:p-6 border-t sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
