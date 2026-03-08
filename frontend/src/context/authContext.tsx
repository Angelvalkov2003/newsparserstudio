import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

const CURRENT_USER_KEY = 'umb_current_user'

export type UserRole = 'admin' | 'user'

export interface CurrentUser {
  id: string
  name: string
  role: UserRole
  isGuest?: boolean
}

interface AuthContextValue {
  currentUser: CurrentUser | null
  login: (name: string, password: string) => { success: boolean; error?: string }
  loginAsGuest: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadStoredUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string' && typeof parsed.role === 'string') {
      const name = parsed.name === 'Гост' ? 'Guest' : parsed.name
      const user = {
        id: parsed.id,
        name,
        role: parsed.role === 'admin' ? 'admin' : 'user',
        isGuest: Boolean(parsed.isGuest),
      }
      if (parsed.name === 'Гост') {
        try {
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
        } catch {}
      }
      return user
    }
  } catch {}
  return null
}

function saveStoredUser(user: CurrentUser | null) {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(CURRENT_USER_KEY)
  }
}

const USERS_STORAGE_KEY = 'umb_users'

function findUserByNameAndPassword(name: string, password: string): CurrentUser | null {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY)
    if (!raw) return null
    const users = JSON.parse(raw)
    if (!Array.isArray(users)) return null
    const trimmed = name.trim().toLowerCase()
    const found = users.find(
      (u: { name?: string; password?: string }) =>
        String(u.name || '').trim().toLowerCase() === trimmed && (u.password ?? '') === password
    )
    if (!found) return null
    return {
      id: found.id,
      name: found.name || '',
      role: found.role === 'admin' ? 'admin' : 'user',
      isGuest: false,
    }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(loadStoredUser)

  useEffect(() => {
    saveStoredUser(currentUser)
  }, [currentUser])

  const login = useCallback((name: string, password: string) => {
    if (!name.trim()) return { success: false, error: 'Enter username.' }
    if (!password) return { success: false, error: 'Enter password.' }
    const user = findUserByNameAndPassword(name, password)
    if (!user) return { success: false, error: 'Wrong username or password.' }
    setCurrentUser(user)
    return { success: true }
  }, [])

  const loginAsGuest = useCallback(() => {
    setCurrentUser({
      id: 'guest',
      name: 'Guest',
      role: 'user',
      isGuest: true,
    })
  }, [])

  const logout = useCallback(() => {
    setCurrentUser(null)
  }, [])

  const value: AuthContextValue = {
    currentUser,
    login,
    loginAsGuest,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useCurrentUser(): CurrentUser | null {
  return useAuth().currentUser
}

export function useIsAdmin(): boolean {
  const user = useCurrentUser()
  return user?.role === 'admin'
}
