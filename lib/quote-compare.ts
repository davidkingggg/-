import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { calculatePriceMetrics } from '@/lib/price-utils'

export interface QuoteCompareFilter {
  categoryId?: string | null;
  compareKey?: string | null;
  keyword?: string | null;
  supplierId?: string | null;
  quoteStage?: string | null;
  startDate?: string | null;
  endDate?: string | null;
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

  if (filter.categoryId) {
    where.categoryId = filter.categoryId;
  }
  
  if (filter.compareKey) {
    where.compareKey = filter.compareKey;
  }

  if (filter.keyword) {
    where.OR = [
      { productName: { contains: filter.keyword } },
      { model: { contains: filter.keyword } },
    ];
  }

  if (filter.supplierId) {
    where.supplierId = filter.supplierId;
  }

  if (filter.quoteStage) {
    where.quoteSheet = {
      ...(where.quoteSheet as Prisma.QuoteSheetWhereInput),
      quoteStage: filter.quoteStage,
    }
  }

  if (filter.startDate || filter.endDate) {
    const dateFilter: Prisma.DateTimeFilter = {}
    if (filter.startDate) dateFilter.gte = new Date(filter.startDate)
    if (filter.endDate) {
      const end = new Date(filter.endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }
    where.quoteSheet = {
      ...(where.quoteSheet as Prisma.QuoteSheetWhereInput),
      quoteDate: dateFilter,
    }
  }

  // 2. Query raw items
  const items = await prisma.quoteItem.findMany({
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

  // Sort result by compareKey
  result.sort((a, b) => a.compareKey.localeCompare(b.compareKey));

  return result;
}
