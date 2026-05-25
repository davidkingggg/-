import { NextRequest, NextResponse } from "next/server";
import { prisma as db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    await requireUser()
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
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    console.error("GET /api/investigations error:", error);
    return NextResponse.json({ error: "获取考察记录列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser()
    const body = await request.json();
    const { 
      type, supplierId, categoryId, date, location, participants,
      keyPoints, productHighlights, priceInfo, qualificationInfo,
      deliveryInfo, afterSalesInfo, risks, nextActions, recommendFollowUp, notes
    } = body;

    if (!type || !date) {
      return NextResponse.json({ error: "请填写记录类型和日期" }, { status: 400 });
    }
    if (!supplierId) {
      return NextResponse.json({ error: "请选择供应商，或先创建新供应商后再保存记录" }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ error: "请选择品类" }, { status: 400 });
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
      },
      include: {
        supplier: { select: { name: true } },
        category: { select: { name: true } },
      },
    });

    return NextResponse.json(record);
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    console.error("POST /api/investigations error:", error);
    return NextResponse.json({ error: (error as Error).message || "新增考察记录失败" }, { status: 400 });
  }
}
