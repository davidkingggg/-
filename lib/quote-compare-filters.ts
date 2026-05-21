import { Prisma } from '@prisma/client'

export type QuoteCompareTextFilterKey = 'productName' | 'model'

export function normalizeQuoteCompareValue(value?: string | null) {
  return value?.trim() || ''
}

export function createNormalizedTextWhere(value?: string | null): Prisma.StringFilter | undefined {
  const normalized = normalizeQuoteCompareValue(value)
  if (!normalized) return undefined

  return { contains: normalized }
}

export function matchesNormalizedText(value: string | null | undefined, filter?: string | null) {
  const normalizedFilter = normalizeQuoteCompareValue(filter)
  if (!normalizedFilter) return true

  return (value?.trim() || '') === normalizedFilter
}

export function itemMatchesNormalizedTextFilters<T extends Record<QuoteCompareTextFilterKey, string | null>>(
  item: T,
  filters: Partial<Record<QuoteCompareTextFilterKey, string | null | undefined>>
) {
  return (
    matchesNormalizedText(item.productName, filters.productName) &&
    matchesNormalizedText(item.model, filters.model)
  )
}
