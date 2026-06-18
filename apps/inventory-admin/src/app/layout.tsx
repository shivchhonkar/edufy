import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@edulakhya/ui/src/styles/portal-theme.css';
import './globals.css';
import AuthWrapper from '@/components/AuthWrapper';
import LayoutWrapper from '@/components/LayoutWrapper';
import { PortalThemeProvider } from '@edulakhya/ui';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Shribi Edufy - Inventory Management',
  description: 'Manage school inventory, stock, and sales',
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
          <AuthWrapper>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </AuthWrapper>
        </PortalThemeProvider>
      </body>
    </html>
  );
}

