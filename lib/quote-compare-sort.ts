export type QuoteCompareSortMode =
  | ''
  | 'priceAsc'
  | 'priceDesc'
  | 'paramAsc'
  | 'paramDesc'

type SortableQuoteItem = {
  compareKey: string
  productName: string
  model: string | null
  price: number | string | { toString(): string } | null
}

type SortableCompareGroup<TItem extends SortableQuoteItem> = {
  compareKey: string
  productName: string
  model: string | null
  minPrice: number | null
  maxPrice: number | null
  items: TItem[]
}

export function normalizeQuoteCompareSortMode(value?: string | null): QuoteCompareSortMode {
  if (value === 'priceAsc' || value === 'priceDesc' || value === 'paramAsc' || value === 'paramDesc') {
    return value
  }
  return ''
}

export function extractFirstSpecNumber(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const text = value?.trim()
    if (!text) continue
    const dnMatch = text.match(/\bDN\s*(\d+(?:\.\d+)?)/i)
    if (dnMatch) return Number(dnMatch[1])
    const numberMatch = text.match(/(\d+(?:\.\d+)?)/)
    if (numberMatch) return Number(numberMatch[1])
  }
  return null
}

function priceValue(value: number | string | { toString(): string } | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function compareNullableNumber(a: number | null, b: number | null, direction: 'asc' | 'desc') {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return direction === 'asc' ? a - b : b - a
}

function compareText(a: string | null | undefined, b: string | null | undefined) {
  return (a || '').localeCompare(b || '', 'zh-CN')
}

function compareItemParam(a: SortableQuoteItem, b: SortableQuoteItem, direction: 'asc' | 'desc') {
  const paramCompare = compareNullableNumber(
    extractFirstSpecNumber(a.model, a.productName, a.compareKey),
    extractFirstSpecNumber(b.model, b.productName, b.compareKey),
    direction
  )
  if (paramCompare !== 0) return paramCompare
  return compareText(a.model || a.productName || a.compareKey, b.model || b.productName || b.compareKey)
}

function compareGroupParam<TItem extends SortableQuoteItem>(
  a: SortableCompareGroup<TItem>,
  b: SortableCompareGroup<TItem>,
  direction: 'asc' | 'desc'
) {
  const paramCompare = compareNullableNumber(
    extractFirstSpecNumber(a.compareKey, a.model, a.productName),
    extractFirstSpecNumber(b.compareKey, b.model, b.productName),
    direction
  )
  if (paramCompare !== 0) return paramCompare
  return compareText(a.compareKey, b.compareKey)
}

export function sortQuoteCompareGroups<TItem extends SortableQuoteItem, TGroup extends SortableCompareGroup<TItem>>(
  groups: TGroup[],
  sortMode: QuoteCompareSortMode
): TGroup[]
export function sortQuoteCompareGroups<TItem extends SortableQuoteItem, TGroup extends SortableCompareGroup<TItem>>(
  groups: TGroup[],
  sortMode: QuoteCompareSortMode
) {
  for (const group of groups) {
    if (sortMode === 'priceAsc') {
      group.items.sort((a, b) => compareNullableNumber(priceValue(a.price), priceValue(b.price), 'asc'))
    } else if (sortMode === 'priceDesc') {
      group.items.sort((a, b) => compareNullableNumber(priceValue(a.price), priceValue(b.price), 'desc'))
    } else if (sortMode === 'paramAsc') {
      group.items.sort((a, b) => compareItemParam(a, b, 'asc'))
    } else if (sortMode === 'paramDesc') {
      group.items.sort((a, b) => compareItemParam(a, b, 'desc'))
    }
  }

  if (sortMode === 'priceAsc') {
    groups.sort((a, b) => compareNullableNumber(a.minPrice, b.minPrice, 'asc'))
  } else if (sortMode === 'priceDesc') {
    groups.sort((a, b) => compareNullableNumber(a.maxPrice, b.maxPrice, 'desc'))
  } else if (sortMode === 'paramAsc') {
    groups.sort((a, b) => compareGroupParam(a, b, 'asc'))
  } else if (sortMode === 'paramDesc') {
    groups.sort((a, b) => compareGroupParam(a, b, 'desc'))
  } else {
    groups.sort((a, b) => a.compareKey.localeCompare(b.compareKey, 'zh-CN'))
  }

  return groups
}
