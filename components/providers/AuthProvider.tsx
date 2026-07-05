'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { SessionUser } from '@/lib/auth'

interface AuthContextType {
  user: SessionUser | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
})

export function AuthProvider({ children, initialUser }: { children: ReactNode; initialUser: SessionUser | null }) {
  const [user, setUser] = useState<SessionUser | null>(initialUser)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setUser(initialUser)
    setLoading(false)
  }, [initialUser])

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/login'
  }

  return <AuthContext.Provider value={{ user, loading, logout }}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => useContext(AuthContext)
