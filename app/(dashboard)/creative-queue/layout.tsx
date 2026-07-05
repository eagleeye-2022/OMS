import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ROLE_DEFAULT_REDIRECT } from '@/lib/constants'

const CREATIVE_QUEUE_ALLOWED_ROLES = ['admin', 'creative']

export default async function CreativeQueueLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')
  if (!CREATIVE_QUEUE_ALLOWED_ROLES.includes(user.role)) {
    redirect(ROLE_DEFAULT_REDIRECT[user.role])
  }

  return <>{children}</>
}
