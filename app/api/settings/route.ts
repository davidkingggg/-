import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-utils'
import { requireSessionAdminForDestructive } from '@/lib/session-admin-auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    })
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: '获取系统设置失败' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    await requireSessionAdminForDestructive()

    const body = await request.json()
    const items = body.items as Array<{ id: string; value: string; notes?: string }>

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: '请提供要更新的设置项列表' }, { status: 400 })
    }

    for (const item of items) {
      if (!item.id) {
        return NextResponse.json({ error: '设置项 ID 不能为空' }, { status: 400 })
      }
      const existing = await prisma.systemSetting.findUnique({ where: { id: item.id } })
      if (!existing) {
        return NextResponse.json({ error: `设置项不存在（ID: ${item.id}）` }, { status: 404 })
      }
      await prisma.systemSetting.update({
        where: { id: item.id },
        data: {
          value: item.value,
          notes: item.notes ?? existing.notes,
        },
      })
    }

    const updated = await prisma.systemSetting.findMany({ orderBy: { key: 'asc' } })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && (error.message === '未登录' || error.message === '需要管理员权限')) {
      const status = error.message === '未登录' ? 401 : 403
      return NextResponse.json({ error: error.message }, { status })
    }
    return NextResponse.json({ error: '更新系统设置失败' }, { status: 500 })
  }
}
