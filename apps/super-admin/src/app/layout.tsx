import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { rootMetadata } from '@/lib/site-seo';
import { SettingsProvider } from '@/shared/SettingsContext';
import { DialogProvider } from '@/shared/context/DialogContext';

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
          <DialogProvider>
            {children}
          </DialogProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}







