import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSessionAdminForDestructive } from '@/lib/session-admin-auth'

type PrismaDelegate = {
  delete: (args: { where: Record<string, unknown> }) => Promise<unknown>
  deleteMany: (args: { where: Record<string, unknown> }) => Promise<unknown>
  findMany: (args: { where: Record<string, unknown>; select?: Record<string, boolean> }) => Promise<{ id: string }[]>
}

function getDelegate(model: string): PrismaDelegate {
  return (prisma as unknown as Record<string, PrismaDelegate>)[model]
}

const DELETE_TYPE_WHITELIST: Record<string, string> = {
  category: 'category',
  supplier: 'supplier',
  suppliercontact: 'supplierContact',
  quotesheet: 'quoteSheet',
  quoteitem: 'quoteItem',
  supplierscore: 'supplierScore',
  investigationrecord: 'investigationRecord',
  supplierdevelopmentprocess: 'supplierDevelopmentProcess',
  purchaseexecutionprocess: 'purchaseExecutionProcess',
  salesmaterial: 'salesMaterial',
}

// Deletion order: children before parents (leaf nodes first)
const DELETE_ORDER: Record<string, number> = {
  quoteitem: 1,
  supplierscore: 1,
  investigationrecord: 1,
  supplierdevelopmentprocess: 1,
  purchaseexecutionprocess: 1,
  salesmaterial: 1,
  quotesheet: 2,
  suppliercontact: 3,
  supplierrisktag: 3,
  attachment: 10,
  supplier: 20,
  category: 30,
}

// Cascade rules: for each parent type, which child records to collect first
// [childType, childPrismaModel, foreignKeyField]
const CASCADE_RULES: Record<string, [string, string, string][]> = {
  category: [
    ['quoteitem', 'quoteItem', 'categoryId'],
    ['supplierscore', 'supplierScore', 'categoryId'],
    ['investigationrecord', 'investigationRecord', 'categoryId'],
    ['supplierdevelopmentprocess', 'supplierDevelopmentProcess', 'categoryId'],
    ['purchaseexecutionprocess', 'purchaseExecutionProcess', 'categoryId'],
    ['salesmaterial', 'salesMaterial', 'categoryId'],
    ['quotesheet', 'quoteSheet', 'categoryId'],
    ['supplier', 'supplier', 'categoryId'],
  ],
  supplier: [
    ['quoteitem', 'quoteItem', 'supplierId'],
    ['supplierscore', 'supplierScore', 'supplierId'],
    ['investigationrecord', 'investigationRecord', 'supplierId'],
    ['supplierdevelopmentprocess', 'supplierDevelopmentProcess', 'supplierId'],
    ['purchaseexecutionprocess', 'purchaseExecutionProcess', 'supplierId'],
    ['quotesheet', 'quoteSheet', 'supplierId'],
    ['suppliercontact', 'supplierContact', 'supplierId'],
  ],
  quotesheet: [
    ['quoteitem', 'quoteItem', 'quoteSheetId'],
  ],
}

// Junction tables with composite keys: delete by FK field directly using deleteMany
const CASCADE_JUNCTION: Record<string, [string, string][]> = {
  supplier: [['SupplierRiskTag', 'supplierId']],
}

interface DeleteItem {
  type: string
  id: string
}

function itemKey(item: DeleteItem) {
  return `${item.type}:${item.id}`
}

async function collectCascadeChildrenRecursive(items: DeleteItem[]): Promise<DeleteItem[]> {
  const allChildren: DeleteItem[] = []
  const seen = new Set(items.map(itemKey))
  let frontier = items

  while (frontier.length > 0) {
    const next: DeleteItem[] = []
    for (const item of frontier) {
      // Standard cascade: collect child records by FK
      const rules = CASCADE_RULES[item.type]
      if (rules) {
        for (const [childType, childModel, fkField] of rules) {
          const delegate = getDelegate(childModel)
          const rows = await delegate.findMany({
            where: { [fkField]: item.id },
            select: { id: true },
          })
          for (const row of rows) {
            const child: DeleteItem = { type: childType, id: row.id }
            const key = itemKey(child)
            if (!seen.has(key)) {
              seen.add(key)
              allChildren.push(child)
              next.push(child)
            }
          }
        }
      }
    }
    frontier = next
  }

  return allChildren
}

export async function POST(request: NextRequest) {
  try {
    await requireSessionAdminForDestructive()

    const body = await request.json()
    const items: DeleteItem[] = body.items

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: '请选择要删除的记录' }, { status: 400 })
    }

    if (items.length > 200) {
      return NextResponse.json({ error: '单次最多删除 200 条记录' }, { status: 400 })
    }

    for (const item of items) {
      if (!item.type || !item.id) {
        return NextResponse.json({ error: '记录格式无效' }, { status: 400 })
      }
      if (!DELETE_TYPE_WHITELIST[item.type]) {
        return NextResponse.json({ error: `不支持的类型: ${item.type}` }, { status: 400 })
      }
    }

    // Collect child records recursively and merge
    const children = await collectCascadeChildrenRecursive(items)
    const seen = new Set<string>()
    const allItems: DeleteItem[] = []
    for (const child of [...children, ...items]) {
      const key = itemKey(child)
      if (!seen.has(key)) {
        seen.add(key)
        allItems.push(child)
      }
    }

    // Sort: children (low order) first, parents (high order) last
    allItems.sort((a, b) => (DELETE_ORDER[a.type] ?? 99) - (DELETE_ORDER[b.type] ?? 99))

    // 删除 junction 关联表（在事务外，因为它们是纯 FK 级联）
    for (const item of allItems) {
      const junctions = CASCADE_JUNCTION[item.type]
      if (junctions) {
        for (const [model, fkField] of junctions) {
          const delegate = getDelegate(model)
          await delegate.deleteMany({ where: { [fkField]: item.id } })
        }
      }
    }

    // 在事务中执行物理删除，失败则回滚
    let deletedCount = 0
    await prisma.$transaction(async (tx) => {
      for (const item of allItems) {
        const modelName = DELETE_TYPE_WHITELIST[item.type]
        if (!modelName) continue
        const delegate = (tx as unknown as Record<string, PrismaDelegate>)[modelName]
        if (!delegate) continue
        await delegate.delete({ where: { id: item.id } })
        deletedCount++
      }
    })

    const cascadeCount = allItems.length - items.length
    const messageParts = [`成功删除 ${deletedCount} 条记录`]
    if (cascadeCount > 0) messageParts.push(`（含 ${cascadeCount} 条关联记录）`)

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      cascade: cascadeCount,
      message: messageParts.join(''),
    })
  } catch (error) {
    if (error instanceof Error && (error.message === '未登录' || error.message === '需要管理员权限')) {
      const status = error.message === '未登录' ? 401 : 403
      return NextResponse.json({ error: error.message }, { status })
    }
    return NextResponse.json({ error: '批量删除失败' }, { status: 500 })
  }
}
