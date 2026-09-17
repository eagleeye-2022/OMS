import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { defaultRedirectFor, isRestrictedAdminEmail } from '@/lib/constants'

const PRODUCTION_ALLOWED_ROLES = ['admin', 'operations']

export default async function ProductionLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')
  if (!PRODUCTION_ALLOWED_ROLES.includes(user.role) || isRestrictedAdminEmail(user.email)) {
    redirect(defaultRedirectFor(user))
  }

  return <>{children}</>
}
