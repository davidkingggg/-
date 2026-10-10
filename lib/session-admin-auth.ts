import { prisma } from './db'
import { getSession } from './session'
import { ADMIN_ERROR, AUTH_ERROR } from './auth-utils'

/**
 * 要求 session-only cookie 认证的管理员权限。
 * 不接受 Agent Bearer token — 用于保护破坏性管理操作
 * （创建用户、恢复数据库、物理删除、系统设置等）。
 */
export async function requireSessionAdmin() {
  const session = await getSession()
  if (!session.userId) throw new Error(AUTH_ERROR)

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, name: true, isAdmin: true, isActive: true, sessionVersion: true },
  })

  if (!user || !user.isActive) throw new Error(AUTH_ERROR)
  if (session.sessionVersion !== user.sessionVersion) throw new Error(AUTH_ERROR)
  if (!user.isAdmin) throw new Error(ADMIN_ERROR)

  return user
}

/**
 * 破坏性管理操作专用：创建用户、恢复数据库、物理删除归档记录、修改系统设置。
 * 仅接受 session cookie，Agent Bearer token 不得调用。
 */
export async function requireSessionAdminForDestructive() {
  return requireSessionAdmin()
}
