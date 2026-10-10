import { createHash, randomBytes } from 'node:crypto'
import { prisma } from './db'

export const AGENT_TOKEN_PREFIX = 'pw_agent_'
const TOKEN_RANDOM_BYTES = 32
const STORED_PREFIX_LENGTH = AGENT_TOKEN_PREFIX.length + 12

export interface CreatedAgentApiTokenSecret {
  raw: string
  prefix: string
  hash: string
}

export function hashAgentApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function createAgentApiTokenSecret(): CreatedAgentApiTokenSecret {
  const raw = `${AGENT_TOKEN_PREFIX}${randomBytes(TOKEN_RANDOM_BYTES).toString('base64url')}`
  return {
    raw,
    prefix: raw.slice(0, STORED_PREFIX_LENGTH),
    hash: hashAgentApiToken(raw),
  }
}

export function isAgentApiTokenValue(value: string | null): value is string {
  return typeof value === 'string' && value.startsWith(AGENT_TOKEN_PREFIX)
}

export async function findActiveAgentApiToken(rawToken: string) {
  if (!isAgentApiTokenValue(rawToken)) return null

  const tokenHash = hashAgentApiToken(rawToken)
  const record = await prisma.agentApiToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
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
      },
    },
  })

  if (!record || !record.isActive || record.revokedAt || !record.user.isActive) return null

  // 节流：仅当 lastUsedAt 超过 10 分钟时才更新，避免每次请求都写 SQLite
  const shouldUpdate = !record.lastUsedAt ||
    (Date.now() - record.lastUsedAt.getTime()) > 10 * 60 * 1000
  if (shouldUpdate) {
    prisma.agentApiToken.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => undefined) // fire-and-forget
  }

  return record
}

export async function logAgentApiUse(input: {
  tokenId: string
  userId: string
  method: string
  path: string
  statusCode?: number | null
  targetType?: string | null
  targetId?: string | null
}) {
  await prisma.agentApiLog.create({
    data: {
      tokenId: input.tokenId,
      userId: input.userId,
      method: input.method,
      path: input.path,
      statusCode: input.statusCode ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
    },
  })
}
