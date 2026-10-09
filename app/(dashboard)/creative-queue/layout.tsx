import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { defaultRedirectFor, isRestrictedAdminEmail } from '@/lib/constants'

const CREATIVE_QUEUE_ALLOWED_ROLES = ['admin', 'creative']

export default async function CreativeQueueLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')
  // The restricted-admin email gets Creative Team access by email, whatever
  // its DB role (it's 'sales' in production).
  if (!CREATIVE_QUEUE_ALLOWED_ROLES.includes(user.role) && !isRestrictedAdminEmail(user.email)) {
    redirect(defaultRedirectFor(user))
  }

  return <>{children}</>
}
