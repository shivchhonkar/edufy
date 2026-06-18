import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@edulakhya/ui/src/styles/portal-theme.css';
import './globals.css';
import AuthWrapper from '@/components/AuthWrapper';
import LayoutWrapper from '@/components/LayoutWrapper';
import { SettingsProvider } from '@/shared/SettingsContext';
import { DialogProvider } from '@/shared/context/DialogContext';
import { PortalThemeProvider } from '@edulakhya/ui';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Fees Management Portal',
  description: 'Manage student fees, payments, and receipts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PortalThemeProvider>
          <SettingsProvider>
            <DialogProvider>
              <AuthWrapper>
                <LayoutWrapper>{children}</LayoutWrapper>
              </AuthWrapper>
            </DialogProvider>
          </SettingsProvider>
        </PortalThemeProvider>
      </body>
    </html>
  );
}
