import { NextResponse } from 'next/server'
import { restoreBackup } from '@/lib/backup-utils'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    return NextResponse.json(
      await restoreBackup(body.fileName, body.confirmText, async () => {
        await prisma.$disconnect()
      })
    )
  } catch (error) {
    if (error instanceof Error && error.message === '需要管理员权限') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '恢复备份失败。' },
      { status: 400 }
    )
  }
}
