import { NextResponse } from 'next/server'
import { createBackup, getBackupsSnapshot } from '@/lib/backup-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await getBackupsSnapshot())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取备份列表失败。' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    return NextResponse.json(await createBackup(), { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建备份失败。' },
      { status: 400 }
    )
  }
}
