import { NextRequest, NextResponse } from "next/server";
import { prisma as db } from "@/lib/db";
import { calculateTotalScore, calculateSystemLevel, calculateFinalLevel, syncSupplierRecommendedLevel, ScoreInput } from "@/lib/score-utils";
import { Prisma } from "@prisma/client";
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('supplierId');
    const categoryId = searchParams.get('categoryId');
    const finalLevel = searchParams.get('finalLevel');

    const where: Prisma.SupplierScoreWhereInput = {
      isArchived: false
    };

    if (supplierId) where.supplierId = supplierId;
    if (categoryId) where.categoryId = categoryId;
    if (finalLevel) where.finalLevel = finalLevel;

    const scores = await db.supplierScore.findMany({
      where,
      orderBy: { totalScore: 'desc' },
      include: {
        supplier: { select: { name: true } },
        category: { select: { name: true } },
        scorer: { select: { name: true } }
      }
    });

    return NextResponse.json(scores);
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    console.error("GET /api/scores error:", error);
    return NextResponse.json({ error: "获取评分列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser()
    const body = await request.json();
    const { supplierId, categoryId, scorerId, scoreDate, scoreReason, manualLevel } = body;

    if (!supplierId || !categoryId || !scorerId || !scoreDate) {
      return NextResponse.json({ error: "请填写完整基础信息" }, { status: 400 });
    }

    const scoreInput: ScoreInput = {
      qualityScore: Number(body.qualityScore || 0),
      priceScore: Number(body.priceScore || 0),
      deliveryScore: Number(body.deliveryScore || 0),
      afterSalesScore: Number(body.afterSalesScore || 0),
      cooperationScore: Number(body.cooperationScore || 0),
      paymentScore: Number(body.paymentScore || 0),
      regionScore: Number(body.regionScore || 0),
    };

    // 自动计算并抛出越界异常
    const totalScore = calculateTotalScore(scoreInput);
    const systemLevel = calculateSystemLevel(totalScore);
    const finalLevel = calculateFinalLevel(systemLevel, manualLevel);

    const score = await db.supplierScore.create({
      data: {
        supplierId,
        categoryId,
        scorerId,
        scoreDate: new Date(scoreDate),
        qualityScore: scoreInput.qualityScore,
        priceScore: scoreInput.priceScore,
        deliveryScore: scoreInput.deliveryScore,
        afterSalesScore: scoreInput.afterSalesScore,
        cooperationScore: scoreInput.cooperationScore,
        paymentScore: scoreInput.paymentScore,
        regionScore: scoreInput.regionScore,
        totalScore,
        systemLevel,
        manualLevel,
        finalLevel,
        scoreReason
      }
    });

    // 推荐等级同步
    await syncSupplierRecommendedLevel(supplierId);

    return NextResponse.json(score);
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    console.error("POST /api/scores error:", error);
    return NextResponse.json({ error: (error as Error).message || "新增评分失败" }, { status: 400 });
  }
}
