'use client';

import '@edulakhya/ui/src/styles/portal-theme.css';
import { PortalThemeProvider } from '@edulakhya/ui';
import PortalShellLayout from '@/shared/components/layout/PortalShellLayout';
import { SchoolBrandingProvider } from '@/features/parent-portal/contexts/SchoolBrandingContext';

export default function ParentPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalThemeProvider>
      <SchoolBrandingProvider>
        <PortalShellLayout portalId="parent">
          <div className="-m-4 sm:-m-6 min-h-full">{children}</div>
        </PortalShellLayout>
      </SchoolBrandingProvider>
    </PortalThemeProvider>
  );
}
