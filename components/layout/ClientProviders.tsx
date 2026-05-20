'use client'

import { createContext, useContext, useEffect, useState, useCallback, startTransition } from 'react'
import { ToastProvider } from '@/components/ui/Toast'

interface AuthUser {
  id: string
  username: string
  name: string
  isAdmin: boolean
  personId: string | null
  person: {
    id: string
    name: string
    role: string | null
    department: string | null
  } | null
  session: {
    userId: string | null
    username: string | null
    name: string | null
    isAdmin: boolean
    personId: string | null
    personName: string | null
  }
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, refresh: async () => {} })

export function useAuth() {
  return useContext(AuthContext)
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        setUser(await res.json())
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    startTransition(() => {
      void refresh()
    })
  }, [refresh])

  return (
    <AuthContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ToastProvider>
  )
}
