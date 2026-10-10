import type { SessionOptions } from 'iron-session'

export const SESSION_COOKIE_NAME = 'gcy_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export interface SessionData {
  userId?: string
  username?: string
  name?: string
  isAdmin?: boolean
  personId?: string
  personName?: string
  sessionVersion?: number
}

const DEV_FALLBACK_SECRET = 'local-dev-only-change-this-in-production-32chars!!'

export function getSessionPassword(): string {
  const password = process.env.SESSION_PASSWORD
  if (password) {
    if (password.length < 32) {
      throw new Error('SESSION_PASSWORD must be at least 32 characters')
    }
    return password
  }
  // 开发模式必须显式开启才允许用回退密钥
  if (process.env.ALLOW_DEV_SESSION_SECRET === 'true') {
    return DEV_FALLBACK_SECRET
  }
  throw new Error(
    'SESSION_PASSWORD is required. Set it in .env or environment. ' +
    'For local dev, also set ALLOW_DEV_SESSION_SECRET=true.'
  )
}

function shouldUseSecureCookies(): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (appUrl && appUrl.startsWith('https://')) return true
  // 生产环境默认安全，除非显式关闭
  if (process.env.NODE_ENV === 'production') {
    return process.env.FORCE_SECURE_COOKIES !== 'false'
  }
  // 本地开发：显式开启才安全
  return process.env.FORCE_SECURE_COOKIES === 'true'
}

export function getSessionOptions(): SessionOptions {
  return {
    password: getSessionPassword(),
    cookieName: SESSION_COOKIE_NAME,
    cookieOptions: {
      maxAge: SESSION_MAX_AGE_SECONDS,
      secure: shouldUseSecureCookies(),
    },
  }
}
