'use client';

import React, { useMemo } from 'react';
import { useSettings } from '@/shared/SettingsContext';
import {
  buildFeeReceiptInnerHtml,
  FEE_RECEIPT_PREVIEW_STYLES,
  type FeeReceiptSettings,
} from '@/features/fees/utils/fee-receipt-print';

interface PrintableReceiptProps {
  payment: any;
  student: any;
}

function buildReceiptSettings(settings: ReturnType<typeof useSettings>['settings']): FeeReceiptSettings {
  return {
    school_name: settings.school_name,
    school_address: settings.school_address,
    school_phone: settings.school_phone,
    school_email: settings.school_email,
    logo_url: settings.logo_url,
    academic_year: settings.academic_year,
  };
}

export default function PrintableReceipt({ payment, student }: PrintableReceiptProps) {
  const { settings } = useSettings();

  const receiptSettings = useMemo(() => buildReceiptSettings(settings), [settings]);

  const receiptHtml = useMemo(
    () => buildFeeReceiptInnerHtml(payment, student, receiptSettings),
    [payment, student, receiptSettings],
  );

  return (
    <div className="fee-receipt-preview w-full bg-white text-[10pt] leading-snug">
      <style dangerouslySetInnerHTML={{ __html: FEE_RECEIPT_PREVIEW_STYLES }} />
      <div id="receipt-content" dangerouslySetInnerHTML={{ __html: receiptHtml }} />
    </div>
  );
}
