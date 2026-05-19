import bcrypt from 'bcryptjs'
import { prisma } from './db'
import { getSession } from './session'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
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
    throw new Error('需要管理员权限')
  }
  return user
}
