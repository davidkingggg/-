import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

const RELATED_TYPE_LABELS: Record<string, string> = {
  QuoteSheet: '报价单',
  Supplier: '供应商',
}

const RELATED_TYPE_LINKS: Record<string, string> = {
  QuoteSheet: '/quotes',
  Supplier: '/suppliers',
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function deriveFileName(filePath: string, fileNameInput: string) {
  if (fileNameInput) return fileNameInput
  const normalizedPath = filePath.replace(/\\/g, '/')
  const lastSegment = normalizedPath.split('/').filter(Boolean).pop()
  return lastSegment || filePath
}

function deriveFileType(filePath: string, fileName: string, fileTypeInput: string) {
  if (fileTypeInput) return fileTypeInput.toLowerCase()

  const candidates = [fileName, filePath.replace(/\\/g, '/').split('/').filter(Boolean).pop() || '']
  for (const candidate of candidates) {
    const lastDot = candidate.lastIndexOf('.')
    if (lastDot !== -1 && lastDot < candidate.length - 1) {
      return candidate.slice(lastDot + 1).toLowerCase()
    }
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const { searchParams } = request.nextUrl
    const relatedType = searchParams.get('relatedType')
    const relatedId = searchParams.get('relatedId')
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const keyword = searchParams.get('keyword')?.trim() || null
    const fileType = searchParams.get('fileType')?.trim() || null

    const where: Record<string, unknown> = {}
    if (!includeArchived) where.isArchived = false
    if (relatedType) where.relatedType = relatedType
    if (relatedId) where.relatedId = relatedId
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
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '获取附件记录失败' }, { status: 500 })
  }
}

// POST - 新增附件记录（当前仅支持 Supplier 路径关联，非文件上传）
export async function POST(request: NextRequest) {
  try {
    await requireUser()
    const body = await request.json()
    const relatedType = normalizeString(body.relatedType)
    const relatedId = normalizeString(body.relatedId)
    const filePath = normalizeString(body.filePath)
    const fileNameInput = normalizeString(body.fileName)
    const fileTypeInput = normalizeString(body.fileType)
    const notes = normalizeString(body.notes)

    if (relatedType !== 'Supplier') {
      return NextResponse.json({ error: '当前仅支持为供应商新增附件路径记录' }, { status: 400 })
    }

    if (!relatedId) {
      return NextResponse.json({ error: '缺少关联供应商 ID' }, { status: 400 })
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: relatedId },
      select: { id: true, isArchived: true },
    })
    if (!supplier) {
      return NextResponse.json({ error: '供应商不存在' }, { status: 404 })
    }
    if (supplier.isArchived) {
      return NextResponse.json({ error: '已归档供应商不能新增附件路径' }, { status: 400 })
    }

    if (!filePath) {
      return NextResponse.json({ error: '文件路径不能为空' }, { status: 400 })
    }

    const fileName = deriveFileName(filePath, fileNameInput)
    const fileType = deriveFileType(filePath, fileName, fileTypeInput)

    const attachment = await prisma.attachment.create({
      data: {
        relatedType: 'Supplier',
        relatedId,
        filePath,
        fileName,
        fileType,
        notes: notes || null,
      },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '新增附件记录失败' }, { status: 500 })
  }
}

export { RELATED_TYPE_LABELS, RELATED_TYPE_LINKS }
