'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FiBell,
  FiCalendar,
  FiChevronDown,
  FiCreditCard,
  FiFileText,
  FiLogOut,
  FiMessageSquare,
  FiSearch,
  FiSettings,
  FiSliders,
  FiTool,
  FiMenu,
} from 'react-icons/fi'
import { clearClientSession, getClientUser, getClientUserRole, isAdminRole } from '@/lib/client-auth'
import { getTimeOfDayGreeting } from '@edulakhya/utils'
import {
  getReadTransactionIds,
  markAllTransactionsRead,
  markTransactionRead,
} from '@/lib/notification-read-state'

interface RecentTransaction {
  id: number
  type: 'fee_payment'
  title: string
  subtitle: string
  amount: number
  time: string
  href: string
}

interface QuickSearchResult {
  type: 'student' | 'staff'
  id: number
  name: string
  subtitle: string
  guardian_label?: string
  phone?: string
  href: string
}

function normalizeSearchResult(raw: Record<string, unknown>): QuickSearchResult {
  const type = raw.type === 'staff' ? 'staff' : 'student'
  const id = Number(raw.id)
  const name = String(raw.name || '')
  const subtitle =
    String(raw.subtitle || '') ||
    [raw.class_label, raw.admission_number].filter(Boolean).join(' · ')

  let guardianLabel = String(raw.guardian_label || '')
  if (!guardianLabel && type === 'student') {
    const parts: string[] = []
    if (raw.father_name) parts.push(`Father: ${raw.father_name}`)
    if (raw.mother_name) parts.push(`Mother: ${raw.mother_name}`)
    if (raw.parent_name && !raw.father_name) parts.push(`Father: ${raw.parent_name}`)
    guardianLabel = parts.join(' · ')
  }
  if (type === 'student' && !guardianLabel) {
    guardianLabel = 'No parent/guardian on file'
  }

  return {
    type,
    id,
    name,
    subtitle,
    guardian_label: guardianLabel,
    phone: raw.phone ? String(raw.phone) : undefined,
    href: String(raw.href || (type === 'staff' ? `/staff/${id}` : `/students/${id}`)),
  }
}

function searchTypeBadge(type: QuickSearchResult['type']) {
  if (type === 'staff') {
    return 'bg-violet-100 text-violet-700'
  }
  return 'bg-blue-100 text-blue-700'
}

function formatRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'A'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function formatHeaderDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

const ADMIN_PROFILE_LINKS = [
  { href: '/setup', label: 'School Setup', icon: FiTool },
  { href: '/settings', label: 'Settings', icon: FiSettings },
  { href: '/settings/theme', label: 'Theme Settings', icon: FiSliders },
  { href: '/settings/reports', label: 'Report Settings', icon: FiFileText },
] as const

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter()
  const searchRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<Record<string, unknown> | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState('Welcome')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<QuickSearchResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [transactions, setTransactions] = useState<RecentTransaction[]>([])
  const [readTransactionIds, setReadTransactionIds] = useState<Set<number>>(new Set())
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [shortcutLabel, setShortcutLabel] = useState('Ctrl+K')

  const userId = user?.id as string | number | undefined

  const loadRecentTransactions = useCallback(async () => {
    setTransactionsLoading(true)
    try {
      const response = await fetch('/api/notifications/recent-transactions')
      const data = await response.json()
      if (data.success) {
        setTransactions(data.data.transactions || [])
      }
    } catch (error) {
      console.error('Error loading recent transactions:', error)
    } finally {
      setTransactionsLoading(false)
    }
  }, [])

  useEffect(() => {
    const clientUser = getClientUser()
    setUser(clientUser)
    setUserRole(getClientUserRole())
    if (clientUser?.id != null) {
      setReadTransactionIds(getReadTransactionIds(clientUser.id as string | number))
    }
    setMounted(true)
    setShortcutLabel(/Mac|iPhone|iPad/i.test(navigator.platform) ? '⌘K' : 'Ctrl+K')
    loadRecentTransactions()
  }, [loadRecentTransactions])

  useEffect(() => {
    if (!mounted) return

    const refreshGreeting = () => setGreeting(getTimeOfDayGreeting())
    refreshGreeting()

    const intervalId = window.setInterval(refreshGreeting, 60_000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshGreeting()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [mounted])

  useEffect(() => {
    const query = searchQuery.trim()
    if (query.length < 2) {
      setSearchResults([])
      setSearchOpen(false)
      setSearchLoading(false)
      return
    }

    const timer = window.setTimeout(async () => {
      setSearchLoading(true)
      try {
        const response = await fetch(
          `/api/search/quick?q=${encodeURIComponent(query)}&limit=8`,
        )
        const data = await response.json()
        if (data.success) {
          const rows = Array.isArray(data.data) ? data.data : []
          setSearchResults(rows.map((row: Record<string, unknown>) => normalizeSearchResult(row)))
          setSearchOpen(true)
        }
      } catch (error) {
        console.error('Student search error:', error)
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const focusSearch = useCallback(() => {
    searchRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        focusSearch()
      }
      if (event.key === 'Escape') {
        setProfileOpen(false)
        setNotificationsOpen(false)
        setSearchOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focusSearch])

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false)
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleLogout = () => {
    clearClientSession()
    window.location.href = '/login'
  }

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    setSearchOpen(false)
    if (searchResults.length === 1) {
      router.push(searchResults[0].href)
      return
    }
    router.push(`/students?search=${encodeURIComponent(query)}`)
  }

  const handleSelectResult = (result: QuickSearchResult) => {
    setSearchOpen(false)
    setSearchQuery(result.name)
    router.push(result.href)
  }

  const handleMarkTransactionRead = (
    event: React.MouseEvent,
    transactionId: number,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    if (userId == null) return
    setReadTransactionIds(markTransactionRead(userId, transactionId))
  }

  const handleMarkAllTransactionsRead = () => {
    if (userId == null || transactions.length === 0) return
    setReadTransactionIds(
      markAllTransactionsRead(
        userId,
        transactions.map((item) => item.id),
      ),
    )
  }

  const displayName = (user?.full_name as string) || 'Admin'
  const welcomeText = mounted ? `${greeting}, ${displayName}` : `Welcome, ${displayName}`
  const displayRole = userRole ? formatRole(userRole) : 'User'
  const avatarUrl = (user?.photo_url as string) || (user?.avatar_url as string) || ''
  const canAccessAdminLinks = useMemo(() => isAdminRole(userRole), [userRole])
  const unreadCount = useMemo(
    () => transactions.filter((item) => !readTransactionIds.has(item.id)).length,
    [transactions, readTransactionIds],
  )

  const closeProfileMenu = () => setProfileOpen(false)

  const handleSidebarToggle = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onMenuClick?.()
      return
    }
    window.dispatchEvent(new CustomEvent('sidebar-toggle-request'))
  }, [onMenuClick])

  const toggleNotifications = () => {
    setNotificationsOpen((open) => {
      const next = !open
      if (next) {
        setProfileOpen(false)
        loadRecentTransactions()
      }
      return next
    })
  }

  return (
    <header className="theme-header border-b border-gray-200/80 px-4 sm:px-6 py-1.5 sm:py-2">
      <div className="flex items-center gap-2 lg:gap-4">
        <div className="flex min-w-0 shrink items-center gap-2">
          <button
            type="button"
            onClick={handleSidebarToggle}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
            aria-label="Toggle sidebar"
          >
            <FiMenu className="h-4 w-4" />
          </button>
          <div className="min-w-0 shrink max-w-[min(42vw,9rem)] sm:max-w-[12rem] md:max-w-[14rem] lg:max-w-[15rem] xl:max-w-[17rem]">
            <h1
              className="flex min-w-0 items-center text-sm leading-tight text-gray-900"
              title={welcomeText}
            >
              <span className="truncate">{welcomeText}</span>
              {/* <span aria-hidden className="ml-1 shrink-0">
              👋
            </span> */}
            </h1>
            <p
              className="truncate text-[10px] leading-tight text-gray-500"
              suppressHydrationWarning
            >
              {mounted ? formatHeaderDate(new Date()) : 'Loading date...'}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 justify-center max-w-xl mx-auto"
        >
          <div ref={searchContainerRef} className="relative w-full">
            <FiSearch
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setSearchOpen(true)
              }}
              placeholder="Search students & staff by name, phone, parent..."
              className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-14 text-xs text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
              aria-label="Search students and staff"
              autoComplete="off"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-gray-200 bg-gray-50 px-1.5 py-px text-[10px] font-medium text-gray-500 sm:inline-block">
              {shortcutLabel}
            </kbd>

            {searchOpen && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                {searchLoading ? (
                  <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No results found</div>
                ) : (
                  <ul className="max-h-80 overflow-y-auto py-1">
                    {searchResults.map((result) => (
                      <li key={`${result.type}-${result.id}`}>
                        <button
                          type="button"
                          onClick={() => handleSelectResult(result)}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {result.name}
                              </p>
                              <span
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${searchTypeBadge(result.type)}`}
                              >
                                {result.type}
                              </span>
                            </div>
                            {result.type === 'student' && (
                              <p
                                className={`mt-0.5 truncate text-xs font-medium ${
                                  result.guardian_label === 'No parent/guardian on file'
                                    ? 'text-gray-400 italic'
                                    : 'text-primary-700'
                                }`}
                              >
                                {result.guardian_label}
                              </p>
                            )}
                            <p className="mt-0.5 truncate text-xs text-gray-500">{result.subtitle}</p>
                            {result.phone && (
                              <p className="truncate text-xs text-gray-400">{result.phone}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!searchLoading && searchResults.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-2">
                    <button
                      type="submit"
                      className="text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      View all results for &quot;{searchQuery.trim()}&quot;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={focusSearch}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            aria-label="Search"
          >
            <FiSearch className="h-4 w-4" />
          </button>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
              aria-label="Recent transactions"
              aria-expanded={notificationsOpen}
              onClick={toggleNotifications}
            >
              <FiBell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-semibold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[320px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg sm:w-[360px]">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Recent Transactions</p>
                    <p className="text-xs text-gray-500">Latest fee payments received</p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllTransactionsRead}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-[320px] overflow-y-auto">
                  {transactionsLoading ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">Loading...</div>
                  ) : transactions.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      No recent transactions
                    </div>
                  ) : (
                    transactions.map((item) => {
                      const isRead = readTransactionIds.has(item.id)
                      return (
                        <div
                          key={item.id}
                          className={`border-b border-gray-50 px-4 py-3 last:border-b-0 ${
                            isRead ? 'opacity-60' : ''
                          }`}
                        >
                          <Link
                            href={item.href}
                            onClick={() => setNotificationsOpen(false)}
                            className="flex items-start gap-3 transition-colors hover:opacity-100"
                          >
                            <div
                              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                isRead ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-600'
                              }`}
                            >
                              <FiCreditCard className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {item.title}
                              </p>
                              <p className="truncate text-xs text-gray-500">{item.subtitle}</p>
                              <p
                                className={`mt-1 text-xs font-semibold ${
                                  isRead ? 'text-gray-600' : 'text-green-700'
                                }`}
                              >
                                {formatCurrency(item.amount)}
                              </p>
                            </div>
                            <span className="shrink-0 text-[11px] text-gray-400">{item.time}</span>
                          </Link>
                          {!isRead && (
                            <button
                              type="button"
                              onClick={(event) => handleMarkTransactionRead(event, item.id)}
                              className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="border-t border-gray-100 px-4 py-2.5">
                  <Link
                    href="/fees/receipts"
                    onClick={() => setNotificationsOpen(false)}
                    className="block text-center text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    View all receipts
                  </Link>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            aria-label="Attendance"
            onClick={() => router.push('/attendance/students')}
          >
            <FiCalendar className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            aria-label="Messages"
            onClick={() => router.push('/communications')}
          >
            <FiMessageSquare className="h-4 w-4" />
          </button>

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((open) => !open)
                setNotificationsOpen(false)
              }}
              className="flex items-center gap-1.5 sm:gap-2 rounded-lg py-0.5 pl-0.5 pr-1.5 sm:pr-2 transition-colors hover:bg-white/70"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white ring-2 ring-white shadow-sm">
                  {getInitials(displayName)}
                </div>
              )}
              <div className="hidden min-w-0 max-w-[8rem] lg:block text-left">
                <p
                  className="truncate text-xs font-semibold text-gray-900 leading-tight"
                  title={displayName}
                >
                  {displayName}
                </p>
                <p className="truncate text-[10px] leading-tight text-gray-500" title={displayRole}>
                  {displayRole}
                </p>
              </div>
              <FiChevronDown
                className={`hidden lg:block h-3.5 w-3.5 text-gray-400 transition-transform ${
                  profileOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {profileOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[210px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
              >
                <div className="border-b border-gray-100 px-4 py-3 lg:hidden">
                  <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500">{displayRole}</p>
                </div>

                {canAccessAdminLinks && (
                  <div className="border-b border-gray-100 py-1">
                    {ADMIN_PROFILE_LINKS.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        role="menuitem"
                        onClick={closeProfileMenu}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <Icon className="h-4 w-4 text-gray-500" />
                        {label}
                      </Link>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <FiLogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
