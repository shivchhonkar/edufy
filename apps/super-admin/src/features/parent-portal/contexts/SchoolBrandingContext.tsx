'use client';

import React, { createContext, useContext, type ReactNode } from 'react';
import { useSettings } from '@/shared/SettingsContext';

export type SchoolBranding = {
  school_name: string;
  logo_url: string;
  favicon_url: string;
};

const defaultBranding: SchoolBranding = {
  school_name: 'School',
  logo_url: '',
  favicon_url: '/shribi-smart-school-logo.png',
};

const SchoolBrandingContext = createContext<{
  branding: SchoolBranding;
  loading: boolean;
}>({
  branding: defaultBranding,
  loading: false,
});

export function SchoolBrandingProvider({ children }: { children: ReactNode }) {
  const { settings, loading } = useSettings();

  const branding: SchoolBranding = {
    school_name: settings.school_name?.trim() || defaultBranding.school_name,
    logo_url: settings.logo_url?.trim() || defaultBranding.logo_url,
    favicon_url: defaultBranding.favicon_url,
  };

  return (
    <SchoolBrandingContext.Provider value={{ branding, loading }}>
      {children}
    </SchoolBrandingContext.Provider>
  );
}

export function useSchoolBranding() {
  return useContext(SchoolBrandingContext);
}
