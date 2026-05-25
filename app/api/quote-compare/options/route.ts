import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'
import {
  createNormalizedTextWhere,
  matchesNormalizedText,
  normalizeQuoteCompareValue,
} from '@/lib/quote-compare-filters'

type FilterKey = 'categoryId' | 'productName' | 'model' | 'compareKey' | 'supplierId' | 'quoteStage' | 'startDate' | 'endDate'

function value(searchParams: URLSearchParams, key: FilterKey) {
  return normalizeQuoteCompareValue(searchParams.get(key))
}

function buildWhere(searchParams: URLSearchParams, omit?: FilterKey): Prisma.QuoteItemWhereInput {
  const where: Prisma.QuoteItemWhereInput = {
    isArchived: false,
    quoteSheet: { isArchived: false },
    supplier: { isArchived: false },
    category: { isArchived: false },
  }

  const categoryId = value(searchParams, 'categoryId')
  const productName = value(searchParams, 'productName')
  const model = value(searchParams, 'model')
  const compareKey = value(searchParams, 'compareKey')
  const supplierId = value(searchParams, 'supplierId')
  const quoteStage = value(searchParams, 'quoteStage')
  const startDate = value(searchParams, 'startDate')
  const endDate = value(searchParams, 'endDate')

  if (categoryId && omit !== 'categoryId') where.categoryId = categoryId
  const productNameWhere = createNormalizedTextWhere(productName)
  if (productNameWhere && omit !== 'productName') where.productName = productNameWhere
  const modelWhere = createNormalizedTextWhere(model)
  if (modelWhere && omit !== 'model') where.model = modelWhere
  if (compareKey && omit !== 'compareKey') where.compareKey = compareKey
  if (supplierId && omit !== 'supplierId') where.supplierId = supplierId

  const quoteSheetWhere = where.quoteSheet as Prisma.QuoteSheetWhereInput
  if (quoteStage && omit !== 'quoteStage') {
    quoteSheetWhere.quoteStage = quoteStage
  }

  if ((startDate && omit !== 'startDate') || (endDate && omit !== 'endDate')) {
    const quoteDate: Prisma.DateTimeFilter = {}
    if (startDate && omit !== 'startDate') quoteDate.gte = new Date(startDate)
    if (endDate && omit !== 'endDate') {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      quoteDate.lte = end
    }
    quoteSheetWhere.quoteDate = quoteDate
  }

  return where
}

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const { searchParams } = new URL(request.url)
    const productName = value(searchParams, 'productName')
    const model = value(searchParams, 'model')

    const [supplierItems, productItems, modelItems, compareKeyItems, stageItems] = await Promise.all([
      prisma.quoteItem.findMany({
        where: buildWhere(searchParams, 'supplierId'),
        distinct: ['supplierId', 'productName', 'model'],
        select: {
          productName: true,
          model: true,
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { supplier: { name: 'asc' } },
      }),
      prisma.quoteItem.findMany({
        where: buildWhere(searchParams, 'productName'),
        distinct: ['productName', 'model'],
        select: {
          productName: true,
          model: true,
        },
        orderBy: { productName: 'asc' },
      }),
      prisma.quoteItem.findMany({
        where: buildWhere(searchParams, 'model'),
        distinct: ['model', 'productName'],
        select: {
          productName: true,
          model: true,
        },
        orderBy: { model: 'asc' },
      }),
      prisma.quoteItem.findMany({
        where: buildWhere(searchParams, 'compareKey'),
        distinct: ['compareKey', 'productName', 'model'],
        select: {
          compareKey: true,
          productName: true,
          model: true,
        },
        orderBy: [{ compareKey: 'asc' }, { productName: 'asc' }, { model: 'asc' }],
      }),
      prisma.quoteItem.findMany({
        where: buildWhere(searchParams, 'quoteStage'),
        distinct: ['quoteSheetId', 'productName', 'model'],
        select: {
          productName: true,
          model: true,
          quoteSheet: { select: { quoteStage: true } },
        },
        orderBy: { quoteSheet: { quoteStage: 'asc' } },
      }),
    ])

    const supplierMap = new Map<string, { id: string; name: string }>()
    for (const item of supplierItems) {
      if (!matchesNormalizedText(item.productName, productName) || !matchesNormalizedText(item.model, model)) continue
      supplierMap.set(item.supplier.id, item.supplier)
    }

    const productNameSet = new Set<string>()
    for (const item of productItems) {
      if (!matchesNormalizedText(item.model, model)) continue
      const name = item.productName?.trim()
      if (name) productNameSet.add(name)
    }

    const modelSet = new Set<string>()
    for (const item of modelItems) {
      if (!matchesNormalizedText(item.productName, productName)) continue
      const model = item.model?.trim()
      if (model) modelSet.add(model)
    }

    const compareKeyMap = new Map<string, { value: string; label: string }>()
    for (const item of compareKeyItems) {
      if (!matchesNormalizedText(item.productName, productName) || !matchesNormalizedText(item.model, model)) continue
      if (!item.compareKey || compareKeyMap.has(item.compareKey)) continue
      const detail = [item.productName, item.model].filter(Boolean).join(' / ')
      compareKeyMap.set(item.compareKey, {
        value: item.compareKey,
        label: detail && detail !== item.compareKey ? `${item.compareKey} (${detail})` : item.compareKey,
      })
    }

    const stageSet = new Set<string>()
    for (const item of stageItems) {
      if (!matchesNormalizedText(item.productName, productName) || !matchesNormalizedText(item.model, model)) continue
      const stage = item.quoteSheet.quoteStage?.trim()
      if (stage) stageSet.add(stage)
    }

    const compareKeys = Array.from(compareKeyMap.values())

    return NextResponse.json({
      suppliers: Array.from(supplierMap.values()),
      productNames: Array.from(productNameSet).sort((a, b) => a.localeCompare(b, 'zh-CN')),
      models: Array.from(modelSet).sort((a, b) => a.localeCompare(b, 'zh-CN')),
      compareKeys,
      products: compareKeys,
      quoteStages: Array.from(stageSet).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    console.error('Failed to get quote compare options:', error)
    return NextResponse.json({ error: '获取报价对比筛选项失败' }, { status: 500 })
  }
}
