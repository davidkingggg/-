import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

type PrismaDelegate = { findMany: (args: unknown) => Promise<Record<string, unknown>[]> }

function getDelegate(model: string): PrismaDelegate {
  return (prisma as unknown as Record<string, PrismaDelegate>)[model]
}

const ARCHIVE_TYPE_WHITELIST: Record<string, {
  model: string
  select: Record<string, boolean>
}> = {
  category: {
    model: 'category',
    select: { id: true, name: true, archivedAt: true },
  },
  supplier: {
    model: 'supplier',
    select: { id: true, name: true, archivedAt: true },
  },
  quotesheet: {
    model: 'quoteSheet',
    select: { id: true, title: true, quoteNumber: true, archivedAt: true },
  },
  quoteitem: {
    model: 'quoteItem',
    select: { id: true, productName: true, model: true, archivedAt: true },
  },
  supplierscore: {
    model: 'supplierScore',
    select: { id: true, scoreDate: true, totalScore: true, archivedAt: true },
  },
  investigationrecord: {
    model: 'investigationRecord',
    select: { id: true, type: true, date: true, archivedAt: true },
  },
  supplierdevelopmentprocess: {
    model: 'supplierDevelopmentProcess',
    select: { id: true, currentStage: true, archivedAt: true },
  },
  purchaseexecutionprocess: {
    model: 'purchaseExecutionProcess',
    select: { id: true, title: true, archivedAt: true },
  },
  salesmaterial: {
    model: 'salesMaterial',
    select: { id: true, title: true, archivedAt: true },
  },
}

const TYPE_LABELS: Record<string, string> = {
  category: '品类',
  supplier: '供应商',
  quotesheet: '报价单',
  quoteitem: '报价明细',
  supplierscore: '供应商评分',
  investigationrecord: '调研/考察记录',
  supplierdevelopmentprocess: '供应商开发流程',
  purchaseexecutionprocess: '采购执行流程',
  salesmaterial: '销售/商务资料',
}

interface ArchiveRecord {
  id: string
  name: string
  type: string
  typeLabel: string
  archivedAt: unknown
}

function extractName(r: Record<string, unknown>): string {
  return (r.name ?? r.title ?? r.productName ?? r.type ?? r.currentStage ?? r.id) as string
}

function toRecord(r: Record<string, unknown>, type: string): ArchiveRecord {
  return {
    id: r.id as string,
    name: extractName(r),
    type,
    typeLabel: TYPE_LABELS[type],
    archivedAt: r.archivedAt,
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const type = request.nextUrl.searchParams.get('type')

    if (type && !ARCHIVE_TYPE_WHITELIST[type]) {
      return NextResponse.json({ error: '归档对象类型无效' }, { status: 400 })
    }

    if (type) {
      const config = ARCHIVE_TYPE_WHITELIST[type]
      const delegate = getDelegate(config.model)
      const records = await delegate.findMany({
        where: { isArchived: true },
        select: config.select,
        orderBy: { archivedAt: 'desc' },
      })
      return NextResponse.json(records.map((r) => toRecord(r, type)))
    }

    // 不传 type：返回全部类型
    const results: ArchiveRecord[] = []

    for (const [key, config] of Object.entries(ARCHIVE_TYPE_WHITELIST)) {
      const delegate = getDelegate(config.model)
      const records = await delegate.findMany({
        where: { isArchived: true },
        select: config.select,
        orderBy: { archivedAt: 'desc' },
      })
      for (const r of records) {
        results.push(toRecord(r, key))
      }
    }

    results.sort((a, b) =>
      new Date(b.archivedAt as string).getTime() - new Date(a.archivedAt as string).getTime()
    )
    return NextResponse.json(results)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '获取归档记录失败' }, { status: 500 })
  }
}
