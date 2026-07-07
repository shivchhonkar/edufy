'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { SCHOOL_SWITCHED_EVENT } from '@/lib/client-auth';
import { useActiveSchoolId } from '@/hooks/use-active-school-id';

interface SystemSettings {
  school_name: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  academic_year: string;
  currency: string;
  date_format: string;
  timezone: string;
  late_fee_percentage: number;
  late_fee_days: number;
  auto_assign_fees: boolean;
  send_notifications: boolean;
  logo_url: string;
}

interface SettingsContextType {
  settings: SystemSettings;
  loading: boolean;
  activeSchoolId: number | null;
  refreshSettings: () => Promise<void>;
  formatCurrency: (amount: number | string) => string;
}

const defaultSettings: SystemSettings = {
  school_name: '',
  school_address: '',
  school_phone: '',
  school_email: '',
  academic_year: '',
  currency: 'INR',
  date_format: 'DD/MM/YYYY',
  timezone: 'Asia/Kolkata',
  late_fee_percentage: 2,
  late_fee_days: 7,
  auto_assign_fees: true,
  send_notifications: true,
  logo_url: '',
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: false,
  activeSchoolId: null,
  refreshSettings: async () => {},
  formatCurrency: (amount) => `₹${amount}`,
});

function SettingsProviderInner({
  children,
  activeSchoolId,
}: {
  children: ReactNode;
  activeSchoolId: number | null;
}) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const fetchOpts: RequestInit = { cache: 'no-store', credentials: 'include' };
      const [settingsResponse, reportsResponse] = await Promise.all([
        fetch('/api/settings', fetchOpts),
        fetch('/api/settings/reports', fetchOpts),
      ]);
      const [settingsData, reportsData] = await Promise.all([
        settingsResponse.json(),
        reportsResponse.json(),
      ]);

      if (settingsData.success) {
        const logoUrl = reportsData.success ? reportsData.data?.logo_url || '' : '';
        setSettings({
          ...defaultSettings,
          ...settingsData.data,
          logo_url: logoUrl,
        });
      } else {
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchSettings();
  }, [fetchSettings, activeSchoolId]);

  useEffect(() => {
    const onSchoolSwitched = () => {
      setLoading(true);
      void fetchSettings();
    };
    window.addEventListener(SCHOOL_SWITCHED_EVENT, onSchoolSwitched);
    return () => window.removeEventListener(SCHOOL_SWITCHED_EVENT, onSchoolSwitched);
  }, [fetchSettings]);

  const refreshSettings = async () => {
    setLoading(true);
    await fetchSettings();
  };

  const getCurrencySymbol = (): string => {
    switch (settings.currency) {
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'INR':
      default:
        return '₹';
    }
  };

  const formatCurrency = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return getCurrencySymbol() + '0.00';

    const formatted = numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return getCurrencySymbol() + formatted;
  };

  return (
    <SettingsContext.Provider
      value={{ settings, loading, activeSchoolId, refreshSettings, formatCurrency }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const activeSchoolId = useActiveSchoolId();

  return (
    <SettingsProviderInner
      key={activeSchoolId ?? 'no-school'}
      activeSchoolId={activeSchoolId}
    >
      {children}
    </SettingsProviderInner>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
