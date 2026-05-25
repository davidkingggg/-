import { NextResponse } from 'next/server'
import { buildCSVTemplateRows, getCSVTemplate, listCSVTemplates } from '@/lib/csv-template-utils'
import { createCSVResponse } from '@/lib/csv-utils'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  await requireUser()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (!type) {
    return NextResponse.json({ templates: listCSVTemplates() })
  }

  const template = getCSVTemplate(type)
  if (!template) {
    return NextResponse.json({ error: '未知的 CSV 模板类型。' }, { status: 404 })
  }

  return createCSVResponse(buildCSVTemplateRows(template), template.fileName)
}
