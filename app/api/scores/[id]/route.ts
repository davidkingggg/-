import { NextRequest, NextResponse } from "next/server";
import { prisma as db } from "@/lib/db";
import { calculateTotalScore, calculateSystemLevel, calculateFinalLevel, syncSupplierRecommendedLevel, ScoreInput } from "@/lib/score-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const score = await db.supplierScore.findUnique({
      where: { id },
      include: {
        supplier: { select: { name: true } },
        category: { select: { name: true } },
        scorer: { select: { name: true } }
      }
    });

    if (!score || score.isArchived) {
      return NextResponse.json({ error: "评分记录不存在或已归档" }, { status: 404 });
    }

    return NextResponse.json(score);
  } catch (error) {
    console.error("GET /api/scores/[id] error:", error);
    return NextResponse.json({ error: "获取评分详情失败" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Allow editing subset or full, but we recalculate based on the provided fields
    const existing = await db.supplierScore.findUnique({ where: { id } });
    if (!existing || existing.isArchived) {
      return NextResponse.json({ error: "记录不存在或已归档" }, { status: 404 });
    }

    const {
      categoryId = existing.categoryId,
      scorerId = existing.scorerId,
      scoreDate = existing.scoreDate,
      scoreReason
    } = body;

    const scoreInput: ScoreInput = {
      qualityScore: Number(body.qualityScore ?? existing.qualityScore ?? 0),
      priceScore: Number(body.priceScore ?? existing.priceScore ?? 0),
      deliveryScore: Number(body.deliveryScore ?? existing.deliveryScore ?? 0),
      afterSalesScore: Number(body.afterSalesScore ?? existing.afterSalesScore ?? 0),
      cooperationScore: Number(body.cooperationScore ?? existing.cooperationScore ?? 0),
      paymentScore: Number(body.paymentScore ?? existing.paymentScore ?? 0),
      regionScore: Number(body.regionScore ?? existing.regionScore ?? 0),
    };

    const totalScore = calculateTotalScore(scoreInput);
    const systemLevel = calculateSystemLevel(totalScore);
    // Be careful with manualLevel, it can be null to clear it
    const finalManualLevel = body.manualLevel !== undefined ? (body.manualLevel || null) : existing.manualLevel;
    const finalLevel = calculateFinalLevel(systemLevel, finalManualLevel);

    const score = await db.supplierScore.update({
      where: { id },
      data: {
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
        manualLevel: finalManualLevel,
        finalLevel,
        scoreReason: scoreReason !== undefined ? scoreReason : existing.scoreReason
      }
    });

    await syncSupplierRecommendedLevel(existing.supplierId);

    return NextResponse.json(score);
  } catch (error: unknown) {
    console.error("PUT /api/scores/[id] error:", error);
    return NextResponse.json({ error: (error as Error).message || "更新评分失败" }, { status: 400 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (body.isArchived === true) {
      const score = await db.supplierScore.update({
        where: { id },
        data: {
          isArchived: true,
          archivedAt: new Date()
        }
      });
      // Sync Recommended Level
      await syncSupplierRecommendedLevel(score.supplierId);
      return NextResponse.json(score);
    }
    
    return NextResponse.json({ error: "不支持的操作" }, { status: 400 });
  } catch (error: unknown) {
    console.error("PATCH /api/scores/[id] error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
