import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireUser()

    const [totalCount, bossDecisionCount, issueCount, amountRows] = await prisma.$transaction([
      prisma.purchaseExecutionProcess.count({ where: { isArchived: false } }),
      prisma.purchaseExecutionProcess.count({ where: { isArchived: false, needBossDecision: true } }),
      prisma.purchaseExecutionProcess.count({
        where: { isArchived: false, status: { in: ['异常', '暂停'] } },
      }),
      prisma.purchaseExecutionProcess.findMany({
        where: { isArchived: false },
        select: { purchaseAmount: true },
      }),
    ])

    const amountTotal = amountRows.reduce((sum, item) => sum + Number(item.purchaseAmount ?? 0), 0)

    return NextResponse.json({
      totalCount,
      bossDecisionCount,
      issueCount,
      amountTotal,
    })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '获取采购看板统计失败' }, { status: 500 })
  }
}
