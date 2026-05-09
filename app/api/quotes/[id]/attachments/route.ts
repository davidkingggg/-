import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - 获取报价单的附件
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const attachments = await prisma.attachment.findMany({
      where: { relatedType: 'QuoteSheet', relatedId: id, isArchived: false },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(attachments)
  } catch {
    return NextResponse.json({ error: '获取附件失败' }, { status: 500 })
  }
}

// POST - 新增附件记录（路径关联，非文件上传）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const quoteSheet = await prisma.quoteSheet.findUnique({ where: { id } })
    if (!quoteSheet) {
      return NextResponse.json({ error: '报价单不存在' }, { status: 404 })
    }

    if (!body.filePath || !body.filePath.trim()) {
      return NextResponse.json({ error: '文件路径不能为空' }, { status: 400 })
    }

    const fp = body.filePath.trim()
    const parts = fp.replace(/\\/g, '/').split('/')
    const fileName = body.fileName || parts[parts.length - 1] || fp
    const dotIdx = fileName.lastIndexOf('.')
    const fileType = body.fileType || (dotIdx !== -1 ? fileName.slice(dotIdx + 1).toLowerCase() : '')

    const attachment = await prisma.attachment.create({
      data: {
        relatedType: 'QuoteSheet',
        relatedId: id,
        filePath: fp,
        fileName,
        fileType,
        notes: body.notes || null,
      },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch {
    return NextResponse.json({ error: '新增附件失败' }, { status: 500 })
  }
}

// PATCH - 归档附件记录
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteSheetId } = await params
    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get('attachmentId')

    if (!attachmentId) {
      return NextResponse.json({ error: '缺少附件 ID' }, { status: 400 })
    }

    const existing = await prisma.attachment.findFirst({
      where: { id: attachmentId, relatedType: 'QuoteSheet', relatedId: quoteSheetId },
    })
    if (!existing) {
      return NextResponse.json({ error: '附件不存在' }, { status: 404 })
    }

    await prisma.attachment.update({
      where: { id: attachmentId },
      data: { isArchived: true, archivedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '归档附件失败' }, { status: 500 })
  }
}
