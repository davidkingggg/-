import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

/**
 * POST /api/suppliers/match
 *
 * 供应商比对接口：优先用供应商名称做规范化匹配，
 * 必要时结合联系人、电话、所在地区等字段辅助判断。
 *
 * Body: { name, contactName?, phone?, region? }
 *
 * Returns:
 *   { matched: true,  supplierId: string, supplier: { id, name, region, companyType } }
 *         当找到精确匹配时。
 *   { matched: false, suggestions: Array<{ id, name, region, companyType }> }
 *         当未精确匹配，但有候选建议时。
 *   { matched: false, suggestions: [] }
 *         完全无匹配时。
 */
export async function POST(request: NextRequest) {
  try {
    await requireUser()
    const body = await request.json()
    const name = (body.name ?? '').trim()
    const contactName = (body.contactName ?? '').trim()
    const phone = (body.phone ?? '').trim()
    const region = (body.region ?? '').trim()

    if (!name) {
      return NextResponse.json({ error: '供应商名称不能为空' }, { status: 400 })
    }

    // 1. 精确匹配名称（trim 后完全相同，未归档）
    const exact = await prisma.supplier.findFirst({
      where: {
        name: { equals: name },
        isArchived: false,
      },
      select: { id: true, name: true, region: true, companyType: true, source: true },
    })
    if (exact) {
      return NextResponse.json({ matched: true, supplierId: exact.id, supplier: exact })
    }

    // 2. 模糊匹配：名称包含关系
    const fuzzy = await prisma.supplier.findMany({
      where: {
        OR: [
          { name: { contains: name } },
          { name: { contains: name.length >= 2 ? name.slice(0, Math.ceil(name.length / 2)) : name } },
          ...(contactName ? [{ contacts: { some: { name: { contains: contactName }, isArchived: false } } }] : []),
          ...(phone ? [{ contacts: { some: { phone: { contains: phone }, isArchived: false } } }] : []),
          ...(phone.length >= 4 ? [{ contacts: { some: { phone: { contains: phone.slice(-4) }, isArchived: false } } }] : []),
        ],
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        region: true,
        companyType: true,
        source: true,
        contacts: {
          where: { isArchived: false },
          select: { name: true, phone: true },
          take: 3,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    })

    // 如果有辅助字段，进一步排序
    let suggestions = fuzzy
    if (fuzzy.length > 0 && (contactName || phone || region)) {
      suggestions = fuzzy.sort((a, b) => {
        let scoreA = 0
        let scoreB = 0
        if (contactName && a.contacts.some(contact => contact.name.includes(contactName))) scoreA += 2
        if (contactName && b.contacts.some(contact => contact.name.includes(contactName))) scoreB += 2
        if (phone && a.contacts.some(contact => contact.phone?.includes(phone) || contact.phone?.includes(phone.slice(-4)))) scoreA += 2
        if (phone && b.contacts.some(contact => contact.phone?.includes(phone) || contact.phone?.includes(phone.slice(-4)))) scoreB += 2
        if (region && a.region?.includes(region)) scoreA++
        if (region && b.region?.includes(region)) scoreB++
        return scoreB - scoreA
      })
    }

    return NextResponse.json({
      matched: false,
      suggestions: suggestions.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        region: supplier.region,
        companyType: supplier.companyType,
        source: supplier.source,
      })),
    })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '供应商匹配失败' }, { status: 500 })
  }
}
