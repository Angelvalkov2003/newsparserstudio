import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  setAuthToken,
  authLogin,
  authGuest,
  authRegister,
  authMe,
  type UserPublic,
} from '../api'

const TOKEN_KEY = 'umb_token'
const USER_KEY = 'umb_current_user'

export type UserRole = 'admin' | 'regular' | 'guest'

export interface CurrentUser {
  id: string
  name: string
  role: UserRole
  isGuest?: boolean
  isVerifiedByAdmin?: boolean
}

interface AuthContextValue {
  currentUser: CurrentUser | null
  login: (name: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (name: string, password: string) => Promise<{ success: boolean; error?: string }>
  loginAsGuest: () => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function userPublicToCurrent(u: UserPublic): CurrentUser {
  return {
    id: u.id,
    name: u.username,
    role: (u.role as UserRole) || 'regular',
    isGuest: u.is_guest,
    isVerifiedByAdmin: u.is_verified_by_admin,
  }
}

function loadStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function saveStored(token: string | null, user: CurrentUser | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = loadStoredToken()
    if (!token) {
      setAuthToken(null)
      setCurrentUser(null)
      setLoading(false)
      return
    }
    setAuthToken(token)
    authMe()
      .then((u) => {
        setCurrentUser(userPublicToCurrent(u))
        saveStored(token, userPublicToCurrent(u))
      })
      .catch(() => {
        setAuthToken(null)
        setCurrentUser(null)
        saveStored(null, null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(
    async (name: string, password: string): Promise<{ success: boolean; error?: string }> => {
      if (!name.trim()) return { success: false, error: 'Enter username.' }
      if (!password) return { success: false, error: 'Enter password.' }
      try {
        const res = await authLogin(name.trim(), password)
        setAuthToken(res.access_token)
        const user = userPublicToCurrent(res.user)
        setCurrentUser(user)
        saveStored(res.access_token, user)
        return { success: true }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Login failed.'
        return { success: false, error: msg }
      }
    },
    []
  )

  const register = useCallback(
    async (name: string, password: string): Promise<{ success: boolean; error?: string }> => {
      if (!name.trim()) return { success: false, error: 'Enter username.' }
      if (!password) return { success: false, error: 'Enter password.' }
      try {
        const res = await authRegister(name.trim(), password)
        setAuthToken(res.access_token)
        const user = userPublicToCurrent(res.user)
        setCurrentUser(user)
        saveStored(res.access_token, user)
        return { success: true }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Registration failed.'
        return { success: false, error: msg }
      }
    },
    []
  )

  const loginAsGuest = useCallback(async () => {
    try {
      const res = await authGuest()
      setAuthToken(res.access_token)
      const user = userPublicToCurrent(res.user)
      setCurrentUser(user)
      saveStored(res.access_token, user)
    } catch {
      // fallback: local-only guest
      setAuthToken(null)
      setCurrentUser({
        id: 'guest-local',
        name: 'Guest',
        role: 'guest',
        isGuest: true,
      })
      saveStored(null, null)
    }
  }, [])

  const logout = useCallback(() => {
    setAuthToken(null)
    setCurrentUser(null)
    saveStored(null, null)
  }, [])

  const value: AuthContextValue = {
    currentUser,
    login,
    register,
    loginAsGuest,
    logout,
    loading,
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
