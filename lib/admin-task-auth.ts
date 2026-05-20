import { prisma } from './db'
import { requireBoundPerson } from './auth-utils'

export async function ensureAdminTaskOwnerPersonId() {
  const currentUser = await requireBoundPerson()
  return currentUser.personId
}

export async function ensureLegacyAdminTasksAssigned() {
  const unassignedCount = await prisma.adminTask.count({
    where: {
      ownerPersonId: null,
    },
  })

  if (unassignedCount === 0) return

  const adminUser = await prisma.user.findFirst({
    where: {
      isAdmin: true,
      isActive: true,
      personId: { not: null },
      person: { isActive: true },
    },
    orderBy: { createdAt: 'asc' },
    select: { personId: true },
  })

  if (!adminUser?.personId) return

  await prisma.adminTask.updateMany({
    where: {
      ownerPersonId: null,
    },
    data: {
      ownerPersonId: adminUser.personId,
    },
  })
}
