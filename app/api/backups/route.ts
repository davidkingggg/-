import { NextResponse } from 'next/server'
import { createBackup, getBackupsSnapshot } from '@/lib/backup-utils'
import { requireAdmin } from '@/lib/auth-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
    return NextResponse.json(await getBackupsSnapshot())
  } catch (error) {
    if (error instanceof Error && error.message === '需要管理员权限') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取备份列表失败。' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    await requireAdmin()
    return NextResponse.json(await createBackup(), { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === '需要管理员权限') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建备份失败。' },
      { status: 400 }
    )
  }
}
