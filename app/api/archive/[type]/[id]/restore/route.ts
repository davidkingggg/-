import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncSupplierRecommendedLevel } from '@/lib/score-utils'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

type PrismaDelegate = { findUnique: (args: unknown) => Promise<Record<string, unknown> | null>; update: (args: unknown) => Promise<unknown> }

function getDelegate(model: string): PrismaDelegate {
  return (prisma as unknown as Record<string, PrismaDelegate>)[model]
}

const RESTORE_TYPE_WHITELIST: Record<string, string> = {
  category: 'category',
  supplier: 'supplier',
  quotesheet: 'quoteSheet',
  quoteitem: 'quoteItem',
  supplierscore: 'supplierScore',
  investigationrecord: 'investigationRecord',
  supplierdevelopmentprocess: 'supplierDevelopmentProcess',
  purchaseexecutionprocess: 'purchaseExecutionProcess',
  admintask: 'adminTask',
  salesmaterial: 'salesMaterial',
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    await requireUser()
    const { type, id } = await params
    const modelName = RESTORE_TYPE_WHITELIST[type]

    if (!modelName) {
      return NextResponse.json({ error: '归档对象类型无效' }, { status: 400 })
    }

    const body = await request.json()
    if (!body.confirmation || body.confirmation !== '确认恢复') {
      return NextResponse.json({ error: '确认短语不正确，请输入"确认恢复"' }, { status: 400 })
    }

    const delegate = getDelegate(modelName)
    const record = await delegate.findUnique({ where: { id } })

    if (!record) {
      return NextResponse.json({ error: '该记录不存在' }, { status: 404 })
    }

    if (!record.isArchived) {
      return NextResponse.json({ error: '该记录未归档，无需恢复' }, { status: 400 })
    }

    await delegate.update({
      where: { id },
      data: { isArchived: false, archivedAt: null },
    })

    // SupplierScore 恢复后同步供应商推荐等级
    if (type === 'supplierscore' && record.supplierId) {
      try {
    await requireUser()
        await syncSupplierRecommendedLevel(record.supplierId as string)
      } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
        // 同步失败不影响恢复结果
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '恢复归档记录失败' }, { status: 500 })
  }
}
