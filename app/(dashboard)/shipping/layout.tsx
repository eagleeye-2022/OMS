import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ROLE_DEFAULT_REDIRECT } from '@/lib/constants'

const SHIPPING_ALLOWED_ROLES = ['admin', 'accounts', 'sales', 'shipping']

export default async function ShippingLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')
  if (!SHIPPING_ALLOWED_ROLES.includes(user.role)) {
    redirect(ROLE_DEFAULT_REDIRECT[user.role])
  }

  return <>{children}</>
}
