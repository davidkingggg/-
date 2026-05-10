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

    const where: Record<string, unknown> = {}
    if (!includeArchived) where.isArchived = false
    if (relatedType) where.relatedType = relatedType

    const records = await prisma.attachment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // 获取所有 relatedType 值用于筛选
    const typeSet = await prisma.attachment.findMany({
      select: { relatedType: true },
      distinct: ['relatedType'],
      where: includeArchived ? {} : { isArchived: false },
    })

    return NextResponse.json({
      records,
      relatedTypes: typeSet.map((t) => t.relatedType).filter(Boolean),
    })
  } catch {
    return NextResponse.json({ error: '获取附件记录失败' }, { status: 500 })
  }
}

// 导出辅助函数供页面使用
export { RELATED_TYPE_LABELS, RELATED_TYPE_LINKS }
