import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { calculatePriceMetrics } from '@/lib/price-utils'
import {
  createNormalizedTextWhere,
  itemMatchesNormalizedTextFilters,
  normalizeQuoteCompareValue,
} from '@/lib/quote-compare-filters'
import {
  normalizeQuoteCompareSortMode,
  sortQuoteCompareGroups,
  type QuoteCompareSortMode,
} from '@/lib/quote-compare-sort'

export interface QuoteCompareFilter {
  categoryId?: string | null;
  productName?: string | null;
  model?: string | null;
  compareKey?: string | null;
  keyword?: string | null;
  supplierId?: string | null;
  quoteStage?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  sortMode?: QuoteCompareSortMode | string | null;
}

export async function getQuoteCompareData(filter: QuoteCompareFilter) {
  // 1. Build where clause
  const where: Prisma.QuoteItemWhereInput = {
    isArchived: false,
    quoteSheet: {
      isArchived: false,
    },
    supplier: {
      isArchived: false,
    },
    category: {
      isArchived: false,
    }
  }

  const categoryId = normalizeQuoteCompareValue(filter.categoryId)
  const productName = normalizeQuoteCompareValue(filter.productName)
  const model = normalizeQuoteCompareValue(filter.model)
  const compareKey = normalizeQuoteCompareValue(filter.compareKey)
  const keyword = normalizeQuoteCompareValue(filter.keyword)
  const supplierId = normalizeQuoteCompareValue(filter.supplierId)
  const quoteStage = normalizeQuoteCompareValue(filter.quoteStage)
  const startDate = normalizeQuoteCompareValue(filter.startDate)
  const endDate = normalizeQuoteCompareValue(filter.endDate)
  const sortMode = normalizeQuoteCompareSortMode(filter.sortMode)

  if (categoryId) {
    where.categoryId = categoryId;
  }

  const productNameWhere = createNormalizedTextWhere(productName)
  if (productNameWhere) {
    where.productName = productNameWhere;
  }

  const modelWhere = createNormalizedTextWhere(model)
  if (modelWhere) {
    where.model = modelWhere;
  }
  
  if (compareKey) {
    where.compareKey = compareKey;
  }

  if (keyword) {
    where.OR = [
      { productName: { contains: keyword } },
      { model: { contains: keyword } },
    ];
  }

  if (supplierId) {
    where.supplierId = supplierId;
  }

  if (quoteStage) {
    where.quoteSheet = {
      ...(where.quoteSheet as Prisma.QuoteSheetWhereInput),
      quoteStage,
    }
  }

  if (startDate || endDate) {
    const dateFilter: Prisma.DateTimeFilter = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }
    where.quoteSheet = {
      ...(where.quoteSheet as Prisma.QuoteSheetWhereInput),
      quoteDate: dateFilter,
    }
  }

  // 2. Query raw items
  const queriedItems = await prisma.quoteItem.findMany({
    where,
    include: {
      quoteSheet: true,
      supplier: true,
      category: true,
    },
    orderBy: [
      { quoteSheet: { quoteDate: 'desc' } },
      { createdAt: 'desc' },
    ]
  });

  const items = queriedItems.filter((item) => itemMatchesNormalizedTextFilters(item, { productName, model }))

  // 3. Group and find representative quote per supplier per compareKey
  // Map<compareKey, Map<supplierId, QuoteItem>>
  const groupedData = new Map<string, Map<string, typeof items[0]>>();

  for (const item of items) {
    if (!groupedData.has(item.compareKey)) {
      groupedData.set(item.compareKey, new Map());
    }
    const supplierMap = groupedData.get(item.compareKey)!;
    // Because items are ordered by quoteDate desc, createdAt desc,
    // the first one we encounter for a supplier is the latest (representative) one.
    if (!supplierMap.has(item.supplierId)) {
      supplierMap.set(item.supplierId, item);
    }
  }

  // 4. Calculate metrics and format result
  const result = Array.from(groupedData.entries()).map(([compareKey, supplierMap]) => {
    const representativeItems = Array.from(supplierMap.values());
    const prices = representativeItems.map(i => i.price);
    const { minPrice, maxPrice, avgPrice } = calculatePriceMetrics(prices);

    return {
      compareKey,
      productName: representativeItems[0]?.productName || compareKey,
      model: representativeItems[0]?.model,
      categoryId: representativeItems[0]?.categoryId,
      categoryName: representativeItems[0]?.category.name,
      items: representativeItems,
      minPrice,
      maxPrice,
      avgPrice,
    };
  });

  return sortQuoteCompareGroups(result, sortMode);
}
