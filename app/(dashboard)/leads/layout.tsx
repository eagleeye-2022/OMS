import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ROLE_DEFAULT_REDIRECT } from '@/lib/constants'

const LEADS_ALLOWED_ROLES = ['admin', 'sales']

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')
  if (!LEADS_ALLOWED_ROLES.includes(user.role)) {
    redirect(ROLE_DEFAULT_REDIRECT[user.role])
  }

  return <>{children}</>
}
