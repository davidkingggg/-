import { NextResponse } from 'next/server'
import { restoreBackup } from '@/lib/backup-utils'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    return NextResponse.json(
      await restoreBackup(body.fileName, body.confirmText, async () => {
        await prisma.$disconnect()
      })
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '恢复备份失败。' },
      { status: 400 }
    )
  }
}
