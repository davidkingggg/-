import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { unsealData } from 'iron-session'
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  type SessionData,
  getSessionPassword,
} from '@/lib/session-config'

const PUBLIC_PATHS = new Set(['/login'])
const PUBLIC_API_PREFIXES = ['/api/auth/']

async function readSession(request: NextRequest) {
  const sealed = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!sealed) return null

  try {
    return await unsealData<SessionData>(sealed, {
      password: getSessionPassword(),
      ttl: SESSION_MAX_AGE_SECONDS,
    })
  } catch {
    return null
  }
}

function isPublicApi(pathname: string) {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await readSession(request)
  const isAuthenticated = Boolean(session?.userId)

  if (PUBLIC_PATHS.has(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (isPublicApi(pathname)) {
    return NextResponse.next()
  }

  if (isAuthenticated) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
