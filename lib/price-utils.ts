import { Decimal } from '@prisma/client/runtime/library'

export function toNumber(val: Decimal | number | string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
  }
  // Check if it's a Prisma Decimal object
  if (val && typeof (val as { toNumber?: unknown }).toNumber === 'function') {
    return (val as { toNumber: () => number }).toNumber();
  }
  return null;
}

export function formatPrice(val: Decimal | number | string | null | undefined): string {
  const num = toNumber(val);
  if (num === null) return '-';
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function calculatePriceMetrics(prices: (Decimal | number | string | null | undefined)[]): { minPrice: number | null, maxPrice: number | null, avgPrice: number | null } {
  const validPrices = prices.map(toNumber).filter((p): p is number => p !== null);
  if (validPrices.length === 0) {
    return { minPrice: null, maxPrice: null, avgPrice: null };
  }
  const minPrice = Math.min(...validPrices);
  const maxPrice = Math.max(...validPrices);
  const avgPrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
  
  return {
    minPrice,
    maxPrice,
    avgPrice: Math.round(avgPrice * 100) / 100
  };
}
