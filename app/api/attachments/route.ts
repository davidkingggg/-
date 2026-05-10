import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const RELATED_TYPE_LABELS: Record<string, string> = {
  QuoteSheet: '报价单',
  Supplier: '供应商',
}

const RELATED_TYPE_LINKS: Record<string, string> = {
  QuoteSheet: '/quotes',
  Supplier: '/suppliers',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const relatedType = searchParams.get('relatedType')
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const keyword = searchParams.get('keyword')?.trim() || null
    const fileType = searchParams.get('fileType')?.trim() || null

    const where: Record<string, unknown> = {}
    if (!includeArchived) where.isArchived = false
    if (relatedType) where.relatedType = relatedType
    if (fileType) where.fileType = fileType

    if (keyword) {
      where.OR = [
        { fileName: { contains: keyword } },
        { filePath: { contains: keyword } },
        { notes: { contains: keyword } },
      ]
    }

    const baseWhere = includeArchived ? {} : { isArchived: false }

    const records = await prisma.attachment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // 获取筛选项
    const [typeSet, fileTypeSet] = await Promise.all([
      prisma.attachment.findMany({
        select: { relatedType: true },
        distinct: ['relatedType'],
        where: baseWhere,
      }),
      prisma.attachment.findMany({
        select: { fileType: true },
        distinct: ['fileType'],
        where: baseWhere,
      }),
    ])

    return NextResponse.json({
      records,
      relatedTypes: typeSet.map((t) => t.relatedType).filter(Boolean),
      fileTypes: fileTypeSet.map((t) => t.fileType).filter(Boolean),
    })
  } catch {
    return NextResponse.json({ error: '获取附件记录失败' }, { status: 500 })
  }
}

export { RELATED_TYPE_LABELS, RELATED_TYPE_LINKS }
