import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import '@edulakhya/ui/src/styles/portal-theme.css'
import './globals.css'
import LayoutWrapper from '@/components/LayoutWrapper'
import { fetchSchoolBranding } from '@/lib/school-info'
import { buildRootMetadata } from '@/lib/site-seo'
import { PortalThemeProvider } from '@edulakhya/ui'

const inter = Inter({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  const host = headers().get('host')
  const branding = await fetchSchoolBranding(host)
  return buildRootMetadata(branding)
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PortalThemeProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </PortalThemeProvider>
      </body>
    </html>
  )
}
