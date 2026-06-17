'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiUser, FiLock, FiEye, FiEyeOff, FiPackage } from 'react-icons/fi'
import { useSchoolBranding } from '@/contexts/SchoolBrandingContext'
import SchoolLogo from '@/components/SchoolLogo'
import { INVENTORY_PORTAL_LABEL } from '@/lib/site-seo'

export default function LoginPage() {
  const router = useRouter()
  const { branding } = useSchoolBranding()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ email: '', password: '' })

  useEffect(() => {
    if (localStorage.getItem('token')) router.push('/')
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (data.success) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        document.cookie = `token=${data.data.token}; path=/; max-age=604800; SameSite=Lax`
        window.location.href = '/'
      } else {
        setError(data.error || 'Invalid credentials')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const schoolName = branding.school_name || 'School'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 p-2">
            <SchoolLogo src={branding.logo_url} alt={schoolName} variant="sidebar-collapsed" className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{schoolName}</h1>
          <p className="text-gray-600">{INVENTORY_PORTAL_LABEL}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <FiPackage className="text-blue-600" size={20} />
            <h2 className="text-xl text-gray-900">Sign In</h2>
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-3.5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="staff@school.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3.5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400">
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Access is granted by school admin under Settings → Staff Access
          </p>
        </div>
      </div>
    </div>
  )
}
