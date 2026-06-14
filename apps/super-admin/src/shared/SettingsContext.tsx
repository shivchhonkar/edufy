'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  refreshSettings: () => Promise<void>;
  formatCurrency: (amount: number | string) => string;
}

const defaultSettings: SystemSettings = {
  school_name: 'Shribi Edufy School',
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
  refreshSettings: async () => {},
  formatCurrency: (amount) => `₹${amount}`
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const [settingsResponse, reportsResponse] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/settings/reports'),
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
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const refreshSettings = async () => {
    setLoading(true);
    await fetchSettings();
  };

  const formatCurrency = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return getCurrencySymbol() + '0.00';
    
    const formatted = numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return getCurrencySymbol() + formatted;
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

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings, formatCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

