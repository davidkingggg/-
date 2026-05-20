import bcrypt from 'bcryptjs'
import { prisma } from './db'
import { getSession } from './session'

export const ADMIN_ERROR = '需要管理员权限'
export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_POLICY_ERROR = `密码至少 ${PASSWORD_MIN_LENGTH} 位`

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function validatePasswordPolicy(password: string): string | null {
  return password.length < PASSWORD_MIN_LENGTH ? PASSWORD_POLICY_ERROR : null
}

export function isAdminError(error: unknown): boolean {
  return error instanceof Error && error.message === ADMIN_ERROR
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session.userId) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, name: true, isAdmin: true, isActive: true },
  })

  if (!user || !user.isActive) return null
  return user
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) {
    throw new Error(ADMIN_ERROR)
  }
  return user
}
