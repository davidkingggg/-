import { prisma } from './db'
import { getSession } from './session'
import { ADMIN_ERROR, AUTH_ERROR } from './auth-utils'

export async function requireSessionAdmin() {
  const session = await getSession()
  if (!session.userId) throw new Error(AUTH_ERROR)

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, name: true, isAdmin: true, isActive: true },
  })

  if (!user || !user.isActive) throw new Error(AUTH_ERROR)
  if (!user.isAdmin) throw new Error(ADMIN_ERROR)

  return user
}
