'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_ADMISSION_NUMBER_SETTINGS,
  formatAdmissionNumber,
  type AdmissionNumberFormatSettings,
} from '@edulakhya/utils';
import { mergeReportSettings } from '@/lib/report-settings';
import { admissionFormatFromReportSettings } from '@/lib/admission-number-settings';

type FormatAdmissionNumber = (value?: string | null) => string;

const AdmissionNumberFormatContext = createContext<FormatAdmissionNumber>((value) =>
  formatAdmissionNumber(value, DEFAULT_ADMISSION_NUMBER_SETTINGS),
);

export function AdmissionNumberFormatProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AdmissionNumberFormatSettings>(
    DEFAULT_ADMISSION_NUMBER_SETTINGS,
  );

  useEffect(() => {
    let cancelled = false;

    fetch('/api/settings/reports', { cache: 'no-store', credentials: 'include' })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data.success) return;
        setSettings(admissionFormatFromReportSettings(mergeReportSettings(data.data)));
      })
      .catch(() => {
        /* keep defaults */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const format = useCallback(
    (value?: string | null) => formatAdmissionNumber(value, settings),
    [settings],
  );

  return (
    <AdmissionNumberFormatContext.Provider value={format}>
      {children}
    </AdmissionNumberFormatContext.Provider>
  );
}

export function useAdmissionNumberFormat(): FormatAdmissionNumber {
  return useContext(AdmissionNumberFormatContext);
}

export function AdmissionNo({
  value,
  className,
}: {
  value?: string | null;
  className?: string;
}) {
  const format = useAdmissionNumberFormat();
  return <span className={className}>{format(value)}</span>;
}
