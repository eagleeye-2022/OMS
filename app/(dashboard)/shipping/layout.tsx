import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ROLE_DEFAULT_REDIRECT } from '@/lib/constants'
import { canAccessShipping } from '@/lib/order-visibility'

export default async function ShippingLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')
  // Role-based shipping access OR an email on the Shipping allowlist (the
  // Production/Shipping team accounts) — single shared gate, see canAccessShipping.
  if (!canAccessShipping(user)) {
    redirect(ROLE_DEFAULT_REDIRECT[user.role])
  }

  return <>{children}</>
}
