import { prisma } from './db'

export function normalizePersonIdInput(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return ''

  const trimmed = value.trim()
  return trimmed || null
}

export async function validatePersonBinding(personId: string | null, excludeUserId?: string) {
  if (!personId) return { personId: null }

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true, name: true, isActive: true },
  })

  if (!person || !person.isActive) {
    throw new Error('请选择有效的绑定人员')
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      personId,
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { id: true, name: true, username: true },
  })

  if (existingUser) {
    throw new Error(`人员「${person.name}」已绑定到用户「${existingUser.name}（${existingUser.username}）」`)
  }

  return { personId: person.id }
}
