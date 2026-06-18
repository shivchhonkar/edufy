import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@edulakhya/ui/src/styles/portal-theme.css'
import './globals.css'
import AuthWrapper from '@/components/AuthWrapper'
import LayoutContent from '@/components/LayoutContent'
import { PortalThemeProvider } from '@edulakhya/ui'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Teacher Portal',
  description: 'Mark attendance, assign homework, and apply for leave',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PortalThemeProvider>
          <AuthWrapper>
            <LayoutContent>{children}</LayoutContent>
          </AuthWrapper>
        </PortalThemeProvider>
      </body>
    </html>
  )
}
