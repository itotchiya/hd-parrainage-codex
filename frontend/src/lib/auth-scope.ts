import type { AuthenticatedUser } from '../types/auth'

function hasPermission(user: AuthenticatedUser | null | undefined, permissionId: string) {
  return user?.permissions.includes(permissionId) ?? false
}

export function isSuperAdminUser(user: AuthenticatedUser | null | undefined) {
  return (user?.roles.some((role) => role.slug === 'super-admin') ?? false) || hasPermission(user, 'dashboard.view-platform')
}

export function isCurrentBusinessOwner(user: AuthenticatedUser | null | undefined) {
  if (user?.current_business_id === null || user?.current_business_id === undefined) {
    return false
  }

  return hasPermission(user, 'dashboard.view-business')
}

export function isCurrentBusinessAgent(user: AuthenticatedUser | null | undefined) {
  if (user?.current_business_id === null || user?.current_business_id === undefined) {
    return false
  }

  return hasPermission(user, 'dashboard.view-own') && !isCurrentBusinessOwner(user)
}
