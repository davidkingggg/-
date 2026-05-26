import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ADMIN_ERROR, isAdminError, requireAdmin } from '@/lib/auth-utils'

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

async function collectCascadeChildren(items: DeleteItem[]): Promise<DeleteItem[]> {
  const children: DeleteItem[] = []
  const seen = new Set(items.map(itemKey))

  for (const item of items) {
    // Standard cascade: collect child records by FK
    const rules = CASCADE_RULES[item.type]
    if (rules) {
      for (const [childType, childModel, fkField] of rules) {
        try {
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
              children.push(child)
            }
          }
        } catch {
          // Skip if model query fails
        }
      }
    }

    // Junction tables: delete directly by FK (composite key, no single `id`)
    const junctions = CASCADE_JUNCTION[item.type]
    if (junctions) {
      for (const [model, fkField] of junctions) {
        try {
          const delegate = getDelegate(model)
          await delegate.deleteMany({ where: { [fkField]: item.id } })
        } catch {
          // Skip if junction delete fails
        }
      }
    }
  }

  return children
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

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

    // Collect child records that must be deleted first (cascade)
    const children = await collectCascadeChildren(items)

    // Merge selected items + cascade children, deduplicate
    const seen = new Set<string>()
    const allItems: DeleteItem[] = []
    for (const child of children) {
      const key = itemKey(child)
      if (!seen.has(key)) {
        seen.add(key)
        allItems.push(child)
      }
    }
    for (const item of items) {
      const key = itemKey(item)
      if (!seen.has(key)) {
        seen.add(key)
        allItems.push(item)
      }
    }

    // Sort: children (low order) first, parents (high order) last
    allItems.sort((a, b) => (DELETE_ORDER[a.type] ?? 99) - (DELETE_ORDER[b.type] ?? 99))

    let deletedCount = 0
    const errors: string[] = []

    for (const item of allItems) {
      try {
        const modelName = DELETE_TYPE_WHITELIST[item.type]
        if (!modelName) continue
        const delegate = getDelegate(modelName)
        await delegate.delete({ where: { id: item.id } })
        deletedCount++
      } catch {
        errors.push(`${item.type}/${item.id}`)
      }
    }

    if (errors.length > 0 && deletedCount === 0) {
      return NextResponse.json({ error: '删除失败，记录可能不存在或存在关联数据' }, { status: 500 })
    }

    const cascadeCount = allItems.length - items.length
    const messageParts = [`成功删除 ${deletedCount} 条记录`]
    if (cascadeCount > 0) messageParts.push(`（含 ${cascadeCount} 条关联记录）`)
    if (errors.length > 0) messageParts.push(`，失败 ${errors.length} 条`)

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      failed: errors.length,
      cascade: cascadeCount,
      message: messageParts.join(''),
    })
  } catch (error) {
    if (isAdminError(error)) {
      return NextResponse.json({ error: ADMIN_ERROR }, { status: 403 })
    }
    return NextResponse.json({ error: '批量删除失败' }, { status: 500 })
  }
}
