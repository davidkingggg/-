import { requireBoundPerson } from './auth-utils'
import { prisma } from './db'

export async function ensureAdminTaskOwnerPersonId() {
  const currentUser = await requireBoundPerson()
  return currentUser.personId
}

export async function findOwnedAdminTask(id: string, ownerPersonId: string, includeArchived = false) {
  return prisma.adminTask.findFirst({
    where: {
      id,
      ownerPersonId,
      ...(includeArchived ? {} : { isArchived: false }),
    },
  })
}

export async function findOwnedArchivedAdminTask(id: string, ownerPersonId: string) {
  return prisma.adminTask.findFirst({
    where: {
      id,
      ownerPersonId,
      isArchived: true,
    },
  })
}
