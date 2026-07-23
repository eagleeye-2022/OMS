'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, ShoppingBag, Palette, Factory,
  Truck, Calculator, UserCog, Settings, LogOut, Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/lib/auth'
import { ROLE_PERMISSIONS } from '@/lib/constants'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  module: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard size={16} />, module: 'dashboard' },
  { label: 'Clients', href: '/clients', icon: <Users size={16} />, module: 'clients' },
  { label: 'Orders', href: '/orders', icon: <ShoppingBag size={16} />, module: 'orders' },
  { label: 'Creative Team', href: '/creative-queue', icon: <Palette size={16} />, module: 'creative-queue' },
  { label: 'Production', href: '/production', icon: <Factory size={16} />, module: 'production' },
  { label: 'Accounts', href: '/accounts', icon: <Calculator size={16} />, module: 'accounts' },
  { label: 'Shipping', href: '/shipping', icon: <Truck size={16} />, module: 'shipping' },
]

const SUPPORT_ITEMS: NavItem[] = [
  { label: 'User Roles', href: '/user-roles', icon: <UserCog size={16} />, module: 'user-roles' },
  { label: 'Settings', href: '/settings', icon: <Settings size={16} />, module: 'settings' },
]

interface SidebarProps {
  user: SessionUser
  onLogout: () => void
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const permissions = ROLE_PERMISSIONS[user.role] || []

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const filteredNav = NAV_ITEMS.filter((item) => permissions.includes(item.module))
  const filteredSupport = SUPPORT_ITEMS.filter((item) => permissions.includes(item.module))

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-red-500 rounded flex items-center justify-center">
            <Package size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900 leading-tight">Bloopers x merchtalk</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Main Menu</p>
          <div className="space-y-0.5">
            {filteredNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <span className={cn(isActive(item.href) ? 'text-blue-600' : 'text-gray-400')}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {filteredSupport.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Support</p>
            <div className="space-y-0.5">
              {filteredSupport.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <span className={cn(isActive(item.href) ? 'text-blue-600' : 'text-gray-400')}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
        >
          <LogOut size={16} className="text-gray-400" />
          Logout
        </button>
      </div>
    </aside>
  )
}
