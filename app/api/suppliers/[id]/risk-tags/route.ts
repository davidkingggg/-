import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

// PUT: 覆盖式更新供应商风险标签（先删旧关联，再建新关联）
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const body = await request.json()

    const supplier = await prisma.supplier.findUnique({ where: { id } })
    if (!supplier) {
      return NextResponse.json({ error: '供应商不存在' }, { status: 404 })
    }

    const riskTagIds = body.riskTagIds as string[]
    if (!Array.isArray(riskTagIds)) {
      return NextResponse.json({ error: '请提供风险标签 ID 列表' }, { status: 400 })
    }

    // 验证所有标签存在
    if (riskTagIds.length > 0) {
      const existingTags = await prisma.riskTag.findMany({
        where: { id: { in: riskTagIds } },
      })
      if (existingTags.length !== riskTagIds.length) {
        return NextResponse.json({ error: '部分风险标签不存在' }, { status: 400 })
      }
    }

    // 事务：先删除旧关联，再建新关联
    await prisma.$transaction(async (tx) => {
      await tx.supplierRiskTag.deleteMany({ where: { supplierId: id } })
      if (riskTagIds.length > 0) {
        await tx.supplierRiskTag.createMany({
          data: riskTagIds.map((tagId) => ({
            supplierId: id,
            riskTagId: tagId,
          })),
        })
      }
    })

    const updated = await prisma.supplierRiskTag.findMany({
      where: { supplierId: id },
      include: { riskTag: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '更新风险标签失败' }, { status: 500 })
  }
}
