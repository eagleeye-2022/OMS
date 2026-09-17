import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { defaultRedirectFor, isRestrictedAdminEmail } from '@/lib/constants'

const USER_ROLES_ALLOWED_ROLES = ['admin']

export default async function UserRolesLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')
  if (!USER_ROLES_ALLOWED_ROLES.includes(user.role) || isRestrictedAdminEmail(user.email)) {
    redirect(defaultRedirectFor(user))
  }

  return <>{children}</>
}
