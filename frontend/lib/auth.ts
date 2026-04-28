export const AUTH_TOKEN_KEY = 'obs_token'
export const AUTH_ROLE_KEY = 'obs_role'
export const AUTH_NAME_KEY = 'obs_name'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function getRole(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_ROLE_KEY)
}

export function getName(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_NAME_KEY)
}

export function setAuth(token: string, role: string, name: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_ROLE_KEY, role)
  localStorage.setItem(AUTH_NAME_KEY, name)
  document.cookie = `obs_token=${token}; path=/; max-age=86400; SameSite=Lax`
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_ROLE_KEY)
  localStorage.removeItem(AUTH_NAME_KEY)
  document.cookie = 'obs_token=; path=/; max-age=0'
}

export function isAdmin(): boolean {
  return getRole() === 'admin'
}

export function isManager(): boolean {
  const role = getRole()
  return role === 'admin' || role === 'manager'
}
