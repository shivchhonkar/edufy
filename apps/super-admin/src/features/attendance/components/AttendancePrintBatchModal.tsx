'use client';

import React, { useEffect, useState } from 'react';
import AppModal, {
  APP_MODAL_BODY,
  APP_MODAL_FOOTER,
  APP_MODAL_HEADER,
  APP_MODAL_PANEL_STRUCTURED,
} from '@/shared/components/common/AppModal';
import {
  buildCalendarPrintSummaryMessage,
  type BatchPrintPromptRequest,
} from '@/features/attendance/utils/student-attendance-calendar-export';

interface AttendancePrintBatchModalProps {
  open: boolean;
  request: BatchPrintPromptRequest | null;
  onContinue: () => void;
  onExit: () => void;
}

export default function AttendancePrintBatchModal({
  open,
  request,
  onContinue,
  onExit,
}: AttendancePrintBatchModalProps) {
  const [answering, setAnswering] = useState(false);

  useEffect(() => {
    setAnswering(false);
  }, [request?.batchIndex]);

  if (!open || !request) return null;

  const remaining = request.batchTotal - request.batchIndex;
  const summaryMessage = buildCalendarPrintSummaryMessage(request.printPlan);

  const handleContinue = () => {
    if (answering) return;
    setAnswering(true);
    onContinue();
  };

  const handleExit = () => {
    if (answering) return;
    setAnswering(true);
    onExit();
  };

  return (
    <AppModal open={open} onClose={handleExit} closeOnBackdrop={false} zIndex={99999}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`${APP_MODAL_PANEL_STRUCTURED} relative z-10 w-full rounded-xl`}
          style={{ maxWidth: '28rem', height: 'auto', maxHeight: '90vh' }}
        >
          <div className={APP_MODAL_HEADER}>
            <h2 className="text-base font-semibold text-gray-900">Print attendance in parts</h2>
          </div>
          <div className={`${APP_MODAL_BODY} px-4 sm:px-6 py-4 space-y-3`}>
            {request.isFirstBatch && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-950">
                {summaryMessage}
              </div>
            )}
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              Print part {request.batchIndex} of {request.batchTotal} · {request.studentCount}{' '}
              student(s) in this part · students {request.studentRangeStart}–{request.studentRangeEnd}{' '}
              of {request.totalStudents}
            </div>
            <p className="text-sm text-gray-600">
              {request.isFirstBatch
                ? 'Each part is sized to fit one print page and opens its own print dialog. You can stop after any part by choosing Exit.'
                : remaining > 0
                  ? `${remaining} part(s) remaining after this one.`
                  : 'This is the last part of the report.'}
            </p>
            <p className="text-xs text-gray-500">
              Tip: In the print dialog, turn off <strong>Headers and footers</strong> to hide the
              browser date, page title, and URL.
            </p>
          </div>
          <div className={APP_MODAL_FOOTER}>
            <button
              type="button"
              onClick={handleExit}
              disabled={answering}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Exit
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={answering}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {request.isFirstBatch ? 'Start printing' : 'Continue printing'}
            </button>
          </div>
        </div>
      </div>
    </AppModal>
  );
}
