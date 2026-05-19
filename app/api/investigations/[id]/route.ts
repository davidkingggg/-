import { NextRequest, NextResponse } from "next/server";
import { prisma as db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await db.investigationRecord.findUnique({
      where: { id },
      include: {
        supplier: { select: { name: true } },
        category: { select: { name: true } }
      }
    });

    if (!record || record.isArchived) {
      return NextResponse.json({ error: "考察记录不存在或已归档" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("GET /api/investigations/[id] error:", error);
    return NextResponse.json({ error: "获取考察记录详情失败" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const existing = await db.investigationRecord.findUnique({ where: { id } });
    if (!existing || existing.isArchived) {
      return NextResponse.json({ error: "记录不存在或已归档" }, { status: 404 });
    }

    const { 
      type, supplierId, categoryId, date, location, participants,
      keyPoints, productHighlights, priceInfo, qualificationInfo,
      deliveryInfo, afterSalesInfo, risks, nextActions, recommendFollowUp, notes
    } = body;

    if (supplierId !== undefined && !supplierId) {
      return NextResponse.json({ error: "请选择供应商" }, { status: 400 });
    }
    if (categoryId !== undefined && !categoryId) {
      return NextResponse.json({ error: "请选择品类" }, { status: 400 });
    }

    const record = await db.investigationRecord.update({
      where: { id },
      data: {
        type: type !== undefined ? type : existing.type,
        supplierId: supplierId !== undefined ? supplierId : existing.supplierId,
        categoryId: categoryId !== undefined ? categoryId : existing.categoryId,
        date: date ? new Date(date) : existing.date,
        location: location !== undefined ? location : existing.location,
        participants: participants !== undefined ? participants : existing.participants,
        keyPoints: keyPoints !== undefined ? keyPoints : existing.keyPoints,
        productHighlights: productHighlights !== undefined ? productHighlights : existing.productHighlights,
        priceInfo: priceInfo !== undefined ? priceInfo : existing.priceInfo,
        qualificationInfo: qualificationInfo !== undefined ? qualificationInfo : existing.qualificationInfo,
        deliveryInfo: deliveryInfo !== undefined ? deliveryInfo : existing.deliveryInfo,
        afterSalesInfo: afterSalesInfo !== undefined ? afterSalesInfo : existing.afterSalesInfo,
        risks: risks !== undefined ? risks : existing.risks,
        nextActions: nextActions !== undefined ? nextActions : existing.nextActions,
        recommendFollowUp: recommendFollowUp !== undefined ? Boolean(recommendFollowUp) : existing.recommendFollowUp,
        notes: notes !== undefined ? notes : existing.notes
      },
      include: {
        supplier: { select: { name: true } },
        category: { select: { name: true } },
      },
    });

    return NextResponse.json(record);
  } catch (error: unknown) {
    console.error("PUT /api/investigations/[id] error:", error);
    return NextResponse.json({ error: (error as Error).message || "更新考察记录失败" }, { status: 400 });
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
      const record = await db.investigationRecord.update({
        where: { id },
        data: {
          isArchived: true,
          archivedAt: new Date()
        }
      });
      return NextResponse.json(record);
    }
    
    return NextResponse.json({ error: "不支持的操作" }, { status: 400 });
  } catch (error: unknown) {
    console.error("PATCH /api/investigations/[id] error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
