import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ROLE_DEFAULT_REDIRECT } from '@/lib/constants'

const ACCOUNTS_ALLOWED_ROLES = ['admin', 'accounts']

export default async function AccountsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')
  if (!ACCOUNTS_ALLOWED_ROLES.includes(user.role)) {
    redirect(ROLE_DEFAULT_REDIRECT[user.role])
  }

  return <>{children}</>
}
