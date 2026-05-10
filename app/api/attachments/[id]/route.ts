import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.attachment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '附件记录不存在' }, { status: 404 })
    }

    // 归档操作
    if (body.archive === true) {
      const record = await prisma.attachment.update({
        where: { id },
        data: { isArchived: true, archivedAt: new Date() },
      })
      return NextResponse.json(record)
    }

    // 编辑基础字段
    const updateData: Record<string, unknown> = {}
    if (body.fileName !== undefined) updateData.fileName = body.fileName.trim() || null
    if (body.filePath !== undefined) updateData.filePath = body.filePath.trim() || null
    if (body.fileType !== undefined) updateData.fileType = body.fileType.trim() || null
    if (body.notes !== undefined) updateData.notes = body.notes.trim() || null

    const record = await prisma.attachment.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json(record)
  } catch {
    return NextResponse.json({ error: '更新附件记录失败' }, { status: 500 })
  }
}
