import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { defaultRedirectFor, isRestrictedAdminEmail } from '@/lib/constants'

const ACCOUNTS_ALLOWED_ROLES = ['admin', 'accounting']

export default async function AccountsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')
  if (!ACCOUNTS_ALLOWED_ROLES.includes(user.role) || isRestrictedAdminEmail(user.email)) {
    redirect(defaultRedirectFor(user))
  }

  return <>{children}</>
}
