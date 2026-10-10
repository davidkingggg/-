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
const AGENT_TOKEN_PREFIX = 'pw_agent_'

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

  if (pathname.startsWith('/_next') || pathname.startsWith('/__nextjs')) {
    return NextResponse.next()
  }

  const session = await readSession(request)
  const isAuthenticated = Boolean(session?.userId && typeof session?.sessionVersion === 'number')
  const authorization = request.headers.get('authorization')
  const bearerPrefix = 'Bearer '
  const hasAgentBearer = Boolean(
    authorization?.startsWith(bearerPrefix) &&
      authorization.slice(bearerPrefix.length).trim().startsWith(AGENT_TOKEN_PREFIX),
  )

  if (PUBLIC_PATHS.has(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    const response = NextResponse.next()
    if (request.cookies.has(SESSION_COOKIE_NAME)) {
      response.cookies.delete(SESSION_COOKIE_NAME)
    }
    return response
  }

  if (isPublicApi(pathname)) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/') && hasAgentBearer) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-request-method', request.method)
    requestHeaders.set('x-request-path', `${pathname}${request.nextUrl.search}`)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  if (isAuthenticated) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    const response = NextResponse.json({ error: '未登录' }, { status: 401 })
    if (request.cookies.has(SESSION_COOKIE_NAME)) {
      response.cookies.delete(SESSION_COOKIE_NAME)
    }
    return response
  }

  const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
  if (request.cookies.has(SESSION_COOKIE_NAME)) {
    redirectResponse.cookies.delete(SESSION_COOKIE_NAME)
  }
  return redirectResponse
}

export const config = {
  matcher: ['/((?!_next/|__nextjs|favicon.ico|.*\\..*).*)'],
}
