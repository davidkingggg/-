import { SessionOptions, getIronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  userId?: string
  username?: string
  name?: string
  isAdmin?: boolean
}

function getSessionPassword(): string {
  const password = process.env.SESSION_PASSWORD
  if (process.env.NODE_ENV === 'production' && !password) {
    throw new Error('SESSION_PASSWORD environment variable is required in production')
  }
  return password || 'local-dev-only-change-this-in-production-32chars!!'
}

export function getSessionOptions(): SessionOptions {
  return {
    password: getSessionPassword(),
    cookieName: 'gcy_session',
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
    },
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, getSessionOptions())
}
