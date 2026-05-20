import { requireBoundPerson } from './auth-utils'

export async function ensureAdminTaskOwnerPersonId() {
  const currentUser = await requireBoundPerson()
  return currentUser.personId
}
