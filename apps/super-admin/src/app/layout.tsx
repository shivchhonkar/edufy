import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { rootMetadata } from '@/lib/site-seo';
import { SettingsProvider } from '@/shared/SettingsContext';
import { ThemeProvider } from '@/shared/ThemeContext';
import { DialogProvider } from '@/shared/context/DialogContext';
import { StaffAccessProvider } from '@/shared/context/StaffAccessContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = rootMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SettingsProvider>
          <ThemeProvider>
            <StaffAccessProvider>
              <DialogProvider>
                {children}
              </DialogProvider>
            </StaffAccessProvider>
          </ThemeProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}







