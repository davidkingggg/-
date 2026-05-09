import { NextRequest, NextResponse } from "next/server";
import { prisma as db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('supplierId');
    const categoryId = searchParams.get('categoryId');
    const type = searchParams.get('type');

    const where: Prisma.InvestigationRecordWhereInput = {
      isArchived: false
    };

    if (supplierId) where.supplierId = supplierId;
    if (categoryId) where.categoryId = categoryId;
    if (type) where.type = type;

    const records = await db.investigationRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        supplier: { select: { name: true } },
        category: { select: { name: true } },
      }
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("GET /api/investigations error:", error);
    return NextResponse.json({ error: "获取考察记录列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type, supplierId, categoryId, date, location, participants,
      keyPoints, productHighlights, priceInfo, qualificationInfo,
      deliveryInfo, afterSalesInfo, risks, nextActions, recommendFollowUp, notes
    } = body;

    if (!type || !supplierId || !categoryId || !date) {
      return NextResponse.json({ error: "请填写完整基础信息" }, { status: 400 });
    }

    const record = await db.investigationRecord.create({
      data: {
        type,
        supplierId,
        categoryId,
        date: new Date(date),
        location,
        participants,
        keyPoints,
        productHighlights,
        priceInfo,
        qualificationInfo,
        deliveryInfo,
        afterSalesInfo,
        risks,
        nextActions,
        recommendFollowUp: Boolean(recommendFollowUp),
        notes
      }
    });

    return NextResponse.json(record);
  } catch (error: unknown) {
    console.error("POST /api/investigations error:", error);
    return NextResponse.json({ error: (error as Error).message || "新增考察记录失败" }, { status: 400 });
  }
}
