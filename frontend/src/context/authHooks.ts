import { useContext } from 'react'
import { AuthContext } from './authContext'
import type { CurrentUser } from './authContext'

export function useAuth() {
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
