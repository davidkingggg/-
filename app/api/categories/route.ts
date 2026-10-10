import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

const MAX_PAGE_SIZE = 100

function parsePagination(searchParams: URLSearchParams) {
  const rawPage = searchParams.get('page')
  const rawPageSize = searchParams.get('pageSize')
  if (!rawPage && !rawPageSize) return null

  const page = Math.max(1, Number.parseInt(rawPage || '1', 10) || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(rawPageSize || '20', 10) || 20))
  return { page, pageSize, skip: (page - 1) * pageSize }
}

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const { searchParams } = new URL(request.url)
    const isPriority = searchParams.get('isPriority')
    const type = searchParams.get('type')
    const pagination = parsePagination(searchParams)

    const where: Prisma.CategoryWhereInput = { isArchived: false }
    if (isPriority === 'true') where.isPriority = true
    if (isPriority === 'false') where.isPriority = false
    if (type) where.type = type

    const query = {
      where,
      orderBy: { createdAt: 'desc' as const },
      ...(pagination ? { skip: pagination.skip, take: pagination.pageSize } : {}),
    }
    const [categories, total] = pagination
      ? await prisma.$transaction([
          prisma.category.findMany(query),
          prisma.category.count({ where }),
        ])
      : [await prisma.category.findMany(query), null]
    if (pagination) {
      return NextResponse.json({
        items: categories,
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total,
          totalPages: Math.ceil((total ?? 0) / pagination.pageSize),
        },
      })
    }
    return NextResponse.json(categories)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '获取品类列表失败' }, { status: 500 })
  }
}

const VALID_LEVELS = ['高', '中', '低']

function validateLevels(body: {
  standardLevel?: string | null
  afterSalesRisk?: string | null
  purchaseFrequency?: string | null
}) {
  if (body.standardLevel && !VALID_LEVELS.includes(body.standardLevel)) {
    return NextResponse.json({ error: '标准化程度必须为：高、中、低' }, { status: 400 })
  }
  if (body.afterSalesRisk && !VALID_LEVELS.includes(body.afterSalesRisk)) {
    return NextResponse.json({ error: '售后风险必须为：高、中、低' }, { status: 400 })
  }
  if (body.purchaseFrequency && !VALID_LEVELS.includes(body.purchaseFrequency)) {
    return NextResponse.json({ error: '采购频率必须为：高、中、低' }, { status: 400 })
  }

  return null
}

export async function POST(request: Request) {
  try {
    await requireUser()
    const body = await request.json()

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: '品类名称不能为空' }, { status: 400 })
    }

    const levelError = validateLevels(body)
    if (levelError) {
      return levelError
    }

    const category = await prisma.category.create({
      data: {
        name: body.name.trim(),
        type: body.type || null,
        isPriority: body.isPriority ?? false,
        standardLevel: body.standardLevel || null,
        afterSalesRisk: body.afterSalesRisk || null,
        purchaseFrequency: body.purchaseFrequency || null,
        notes: body.notes || null,
      },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '新增品类失败' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    await requireUser()
    const body = await request.json()

    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: '缺少品类ID' }, { status: 400 })
    }
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: '品类名称不能为空' }, { status: 400 })
    }

    const levelError = validateLevels(body)
    if (levelError) {
      return levelError
    }

    const existing = await prisma.category.findUnique({ where: { id: body.id } })
    if (!existing) {
      return NextResponse.json({ error: '品类不存在' }, { status: 404 })
    }

    const category = await prisma.category.update({
      where: { id: body.id },
      data: {
        name: body.name.trim(),
        type: body.type !== undefined ? body.type : existing.type,
        isPriority: body.isPriority ?? existing.isPriority,
        standardLevel: body.standardLevel !== undefined ? body.standardLevel : existing.standardLevel,
        afterSalesRisk: body.afterSalesRisk !== undefined ? body.afterSalesRisk : existing.afterSalesRisk,
        purchaseFrequency: body.purchaseFrequency !== undefined ? body.purchaseFrequency : existing.purchaseFrequency,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
    })
    return NextResponse.json(category)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '编辑品类失败' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireUser()
    const body = await request.json()

    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: '缺少品类ID' }, { status: 400 })
    }

    const existing = await prisma.category.findUnique({ where: { id: body.id } })
    if (!existing) {
      return NextResponse.json({ error: '品类不存在' }, { status: 404 })
    }

    const category = await prisma.category.update({
      where: { id: body.id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    })
    return NextResponse.json(category)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '归档品类失败' }, { status: 500 })
  }
}
