import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthWrapper from '@/components/AuthWrapper';
import LayoutWrapper from '@/components/LayoutWrapper';
import { SettingsProvider } from '@/shared/SettingsContext';
import { DialogProvider } from '@/shared/context/DialogContext';

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
        <SettingsProvider>
          <DialogProvider>
            <AuthWrapper>
              <LayoutWrapper>{children}</LayoutWrapper>
            </AuthWrapper>
          </DialogProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
