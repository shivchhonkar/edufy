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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
