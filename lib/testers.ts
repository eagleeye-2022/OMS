import { ROLES, type Role } from './constants'

// ============================================================================
// TESTER ROLE MAP — the ONLY source of truth for who may use the
// role-picker tester-login flow (app/(auth)/tester-login) and which roles
// they're allowed to test as. Every email is a real roster account already
// created by /api/admin/bootstrap with a fixed DB role (see DEMO_USERS
// there) — this map does not grant login access, it only widens which
// `role` claim verify-login-otp is allowed to put in the session JWT for
// that already-authenticated account. An email with no entry here can never
// get a session role other than its own User.role, no matter what the
// client sends — see resolveSessionRole in the two auth routes.
//
// Vaishnavi is the full-system tester and can exercise every module from
// her one inbox. Ishita and Mohit are admin-panel testers, so they're
// restricted to 'admin' — narrower than Vaishnavi by design, not an
// oversight. Extend this list only for other known internal testers; never
// add a production roster email here.
// ============================================================================
const TESTER_ROLE_MAP: Record<string, Role[]> = {
  'vaishnavi.shivhare@eagleeyedigital.io': [ROLES.ADMIN, ROLES.OPERATIONS, ROLES.SALES, ROLES.ACCOUNTING, ROLES.CREATIVE],
  'ishita.vishwakarma@eagleeyedigital.io': [ROLES.ADMIN],
  'mohit@eagleeyedigital.io': [ROLES.ADMIN],
}

export function getTesterAllowedRoles(email: string): Role[] {
  return TESTER_ROLE_MAP[email.toLowerCase()] ?? []
}

export function isTesterEmail(email: string): boolean {
  return getTesterAllowedRoles(email).length > 0
}
