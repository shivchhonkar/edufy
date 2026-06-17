'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (pathname === '/login') {
      setIsChecking(false)
      return
    }
    if (!isAuthenticated()) {
      router.push('/login')
    } else {
      setIsChecking(false)
    }
  }, [router, pathname])

  if (isChecking && pathname !== '/login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
