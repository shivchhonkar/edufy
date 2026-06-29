'use client';

import '@edulakhya/ui/src/styles/portal-theme.css';
import { PortalThemeProvider } from '@edulakhya/ui';
import PortalShellLayout from '@/shared/components/layout/PortalShellLayout';

export default function TransportPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalThemeProvider>
      <PortalShellLayout portalId="transport">
        <div className="-m-4 sm:-m-6 min-h-full">{children}</div>
      </PortalShellLayout>
    </PortalThemeProvider>
  );
}
