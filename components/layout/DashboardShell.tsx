'use client'

import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { NotificationsProvider } from '@/components/providers/NotificationsProvider'
import type { SessionUser } from '@/lib/auth'

interface DashboardShellProps {
  user: SessionUser
  children: ReactNode
  pageTitle?: string
  pageSubtitle?: string
}

export function DashboardShell({ user, children, pageTitle, pageSubtitle }: DashboardShellProps) {
  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/login'
  }

  return (
    <AuthProvider initialUser={user}>
      <NotificationsProvider>
        <div className="flex h-screen bg-gray-50 overflow-hidden">
          <Sidebar user={user} onLogout={logout} />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Topbar user={user} title={pageTitle} subtitle={pageSubtitle} />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </NotificationsProvider>
    </AuthProvider>
  )
}
