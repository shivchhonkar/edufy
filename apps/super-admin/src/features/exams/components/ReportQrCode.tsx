'use client';

import { useMemo, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  buildMarksheetQrPayload,
  buildMarksheetQrValue,
  type MarksheetQrPayload,
} from '@/lib/marksheet-qr';

type ReportQrCodeProps = {
  payload: MarksheetQrPayload;
  color?: string;
  size?: number;
  className?: string;
};

export default function ReportQrCode({
  payload,
  color = '#0f172a',
  size = 72,
  className = '',
}: ReportQrCodeProps) {
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const qrValue = useMemo(
    () => buildMarksheetQrValue(payload, origin || undefined),
    [payload, origin]
  );

  return (
    <div
      className={`inline-flex bg-white p-1 border shrink-0 ${className}`}
      style={{ borderColor: color }}
      title="Scan to verify marksheet"
    >
      <QRCodeSVG
        value={qrValue}
        size={size}
        level="M"
        includeMargin={false}
        fgColor={color}
        bgColor="#ffffff"
      />
    </div>
  );
}

export { buildMarksheetQrPayload, type MarksheetQrPayload };
