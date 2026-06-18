export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function getUser(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function logout() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  document.cookie = 'token=; path=/; max-age=0'
  window.location.href = '/login'
}

export function getAuthHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
