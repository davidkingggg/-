import { prisma as db } from './db';

export const SCORE_LEVELS = {
  A: "A优先推荐",
  B: "B备选",
  C: "C暂不推荐",
  NONE: "未评级"
} as const;

export type ScoreInput = {
  qualityScore: number;
  priceScore: number;
  deliveryScore: number;
  afterSalesScore: number;
  cooperationScore: number;
  paymentScore: number;
  regionScore: number;
};

/**
 * 严格计算并校验总分
 */
export function calculateTotalScore(scores: Partial<ScoreInput>): number {
  const quality = scores.qualityScore ?? 0;
  const price = scores.priceScore ?? 0;
  const delivery = scores.deliveryScore ?? 0;
  const afterSales = scores.afterSalesScore ?? 0;
  const cooperation = scores.cooperationScore ?? 0;
  const payment = scores.paymentScore ?? 0;
  const region = scores.regionScore ?? 0;

  if (quality < 0 || quality > 25) throw new Error("质量评分必须在 0-25 之间");
  if (price < 0 || price > 20) throw new Error("价格评分必须在 0-20 之间");
  if (delivery < 0 || delivery > 15) throw new Error("交付能力评分必须在 0-15 之间");
  if (afterSales < 0 || afterSales > 15) throw new Error("售后评分必须在 0-15 之间");
  if (cooperation < 0 || cooperation > 10) throw new Error("合作意愿评分必须在 0-10 之间");
  if (payment < 0 || payment > 10) throw new Error("账期条件评分必须在 0-10 之间");
  if (region < 0 || region > 5) throw new Error("区域覆盖评分必须在 0-5 之间");

  return quality + price + delivery + afterSales + cooperation + payment + region;
}

/**
 * 自动计算系统评级
 */
export function calculateSystemLevel(totalScore: number): string {
  if (totalScore >= 85) return SCORE_LEVELS.A;
  if (totalScore >= 70) return SCORE_LEVELS.B;
  return SCORE_LEVELS.C;
}

/**
 * 计算最终评级（有手动调整则优先）
 */
export function calculateFinalLevel(systemLevel: string, manualLevel?: string | null): string {
  if (manualLevel && manualLevel.trim() !== "") {
    return manualLevel;
  }
  return systemLevel;
}

/**
 * 同步供应商推荐等级
 * 规则：获取最新未归档评分的 finalLevel。如果不存在，则重置为“未评级”。
 */
export async function syncSupplierRecommendedLevel(supplierId: string) {
  const latestScore = await db.supplierScore.findFirst({
    where: {
      supplierId,
      isArchived: false,
    },
    orderBy: [
      { scoreDate: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  const recommendedLevel = latestScore?.finalLevel || SCORE_LEVELS.NONE;

  await db.supplier.update({
    where: { id: supplierId },
    data: { recommendedLevel }
  });
}
