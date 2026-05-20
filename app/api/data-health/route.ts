import { NextResponse } from 'next/server'
import { ADMIN_ERROR, isAdminError, requireAdmin } from '@/lib/auth-utils'
import { buildDataHealthReport } from '@/lib/data-health'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
    return NextResponse.json(await buildDataHealthReport())
  } catch (error) {
    if (isAdminError(error)) {
      return NextResponse.json({ error: ADMIN_ERROR }, { status: 403 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取数据健康状态失败。' },
      { status: 500 }
    )
  }
}
