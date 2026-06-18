import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthWrapper from '@/components/AuthWrapper'
import LayoutContent from '@/components/LayoutContent'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Teacher Portal',
  description: 'Mark attendance, assign homework, and apply for leave',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthWrapper>
          <LayoutContent>{children}</LayoutContent>
        </AuthWrapper>
      </body>
    </html>
  )
}
