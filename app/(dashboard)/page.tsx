import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { defaultRedirectFor, isRestrictedAdminEmail } from '@/lib/constants'
import { DashboardView } from '@/components/dashboard/DashboardView'

const DASHBOARD_ALLOWED_ROLES = ['admin']

export default async function DashboardPage() {
  const user = await getSession()
  if (!user) redirect('/login')
  if (!DASHBOARD_ALLOWED_ROLES.includes(user.role) || isRestrictedAdminEmail(user.email)) {
    redirect(defaultRedirectFor(user))
  }

  return <DashboardView />
}
