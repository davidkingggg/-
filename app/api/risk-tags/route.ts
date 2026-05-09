import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const tags = await prisma.riskTag.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(tags)
  } catch {
    return NextResponse.json({ error: '获取风险标签失败' }, { status: 500 })
  }
}
