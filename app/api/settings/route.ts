import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
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
      // 只允许更新 value 和 notes，不允许修改 key
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
  } catch {
    return NextResponse.json({ error: '更新系统设置失败' }, { status: 500 })
  }
}
