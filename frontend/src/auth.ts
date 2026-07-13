// Token 和用户信息的本地管理

export interface AuthUser {
  id: number
  email: string
  nickname: string
}

const TOKEN_KEY = 'ct_token'
const USER_KEY  = 'ct_user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): AuthUser | null {
  const s = localStorage.getItem(USER_KEY)
  try { return s ? JSON.parse(s) : null } catch { return null }
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isLoggedIn(): boolean {
  return !!getToken()
}
