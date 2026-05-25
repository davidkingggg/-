import bcrypt from 'bcryptjs'
import { headers } from 'next/headers'
import { prisma } from './db'
import { getSession } from './session'
import { findActiveAgentApiToken, isAgentApiTokenValue, logAgentApiUse } from './agent-api-tokens'

export const AUTH_ERROR = '未登录'
export const ADMIN_ERROR = '需要管理员权限'
export const PERSON_BINDING_ERROR = '当前账号未绑定人员，请联系管理员在用户管理中绑定后再使用个人数据'
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

export function isAuthError(error: unknown): boolean {
  return error instanceof Error && error.message === AUTH_ERROR
}

export function isPersonBindingError(error: unknown): boolean {
  return error instanceof Error && error.message === PERSON_BINDING_ERROR
}

export async function getCurrentUser() {
  const headerStore = await headers()
  const authorization = headerStore.get('authorization')
  const bearerPrefix = 'Bearer '
  const rawToken = authorization?.startsWith(bearerPrefix) ? authorization.slice(bearerPrefix.length).trim() : null

  if (isAgentApiTokenValue(rawToken)) {
    const token = await findActiveAgentApiToken(rawToken)
    if (!token) return null

    const user = token.user.person && !token.user.person.isActive
      ? {
          ...token.user,
          personId: null,
          person: null,
        }
      : token.user

    const method = headerStore.get('x-request-method') || 'UNKNOWN'
    const path = headerStore.get('x-request-path') || 'UNKNOWN'
    await logAgentApiUse({
      tokenId: token.id,
      userId: token.userId,
      method,
      path,
      statusCode: null,
    }).catch(() => undefined)

    return user
  }

  const session = await getSession()
  if (!session.userId) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      name: true,
      isAdmin: true,
      isActive: true,
      personId: true,
      person: {
        select: {
          id: true,
          name: true,
          role: true,
          department: true,
          isActive: true,
        },
      },
    },
  })

  if (!user || !user.isActive) return null
  if (user.person && !user.person.isActive) {
    return {
      ...user,
      personId: null,
      person: null,
    }
  }
  return user
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error(AUTH_ERROR)
  }
  return user
}

export async function requireBoundPerson() {
  const user = await requireUser()
  if (!user.personId || !user.person) {
    throw new Error(PERSON_BINDING_ERROR)
  }
  return user as typeof user & { personId: string; person: NonNullable<typeof user.person> }
}

export async function requireAdmin() {
  const user = await requireUser()
  if (!user.isAdmin) {
    throw new Error(ADMIN_ERROR)
  }
  return user
}
