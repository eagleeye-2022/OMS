import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

// Settings is self-service — every role manages their own profile and
// password here (see "My Profile" / "Change Password" in the page), so
// unlike the other module layouts, access isn't restricted by role, only
// by being logged in.
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')

  return <>{children}</>
}
