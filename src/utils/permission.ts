import { getUserPermissionView } from '../api/admin'

const STORAGE_KEY = 'vspicy_permission_view'
const USER_ID_KEY = 'vspicy_user_id'

export type PermissionView = {
  userId: number
  roles: any[]
  menus: any[]
  permissionCodes: string[]
}

export function currentUserId() {
  const value = localStorage.getItem(USER_ID_KEY)
  return value ? Number(value) : 1
}

export function saveCurrentUserId(userId: number) {
  localStorage.setItem(USER_ID_KEY, String(userId))
}

export function getCachedPermissionView(): PermissionView | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function loadPermissionView(force = false): Promise<PermissionView | null> {
  if (!force) {
    const cached = getCachedPermissionView()
    if (cached) return cached
  }

  try {
    const res: any = await getUserPermissionView(currentUserId())
    if (res.code === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data))
      return res.data
    }
    return null
  } catch {
    return null
  }
}

export function hasPermission(code?: string, view?: PermissionView | null) {
  if (!code) return true

  const permissionView = view || getCachedPermissionView()
  if (!permissionView) {
    return true
  }

  const roleCodes = (permissionView.roles || []).map((role: any) => role.roleCode)
  if (roleCodes.includes('SUPER_ADMIN')) {
    return true
  }

  const codes = permissionView.permissionCodes || []
  return codes.includes('*') || codes.includes(code)
}

export function clearPermissionCache() {
  localStorage.removeItem(STORAGE_KEY)
}
