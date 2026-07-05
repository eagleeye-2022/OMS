import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ROLE_DEFAULT_REDIRECT } from '@/lib/constants'
import { DashboardView } from '@/components/dashboard/DashboardView'

const DASHBOARD_ALLOWED_ROLES = ['admin']

export default async function DashboardPage() {
  const user = await getSession()
  if (!user) redirect('/login')
  if (!DASHBOARD_ALLOWED_ROLES.includes(user.role)) {
    redirect(ROLE_DEFAULT_REDIRECT[user.role])
  }

  return <DashboardView />
}
