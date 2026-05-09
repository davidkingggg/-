import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  validateSupplierAndCategory,
  validatePerson,
  isValidEnum,
  parseDate,
  parseAmount,
  isValidAmount,
} from '@/lib/workflow-validation';
import { PURCHASE_STAGES, PRIORITIES, PURCHASE_STATUSES } from '@/lib/workflow-constants';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const categoryId = searchParams.get('categoryId');
    const ownerId = searchParams.get('ownerId');
    const requesterId = searchParams.get('requesterId');
    const salesPersonId = searchParams.get('salesPersonId');
    const currentStage = searchParams.get('currentStage');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const needBossDecision = searchParams.get('needBossDecision');

    const where: Prisma.PurchaseExecutionProcessWhereInput = { isArchived: false };

    if (supplierId) where.supplierId = supplierId;
    if (categoryId) where.categoryId = categoryId;
    if (ownerId) where.ownerId = ownerId;
    if (requesterId) where.requesterId = requesterId;
    if (salesPersonId) where.salesPersonId = salesPersonId;
    if (currentStage) where.currentStage = currentStage;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (needBossDecision === 'true') where.needBossDecision = true;

    const items = await prisma.purchaseExecutionProcess.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        supplier: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true } },
        salesPerson: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching purchase processes:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      supplierId,
      categoryId,
      requesterId,
      ownerId,
      salesPersonId,
      currentStage,
      priority,
      dueDate,
      currentProblem,
      nextAction,
      needBossDecision,
      needPaymentRequest,
      purchaseAmount,
      contractNo,
      contractDate,
      paymentRequestDate,
      arrivalDate,
      acceptanceDate,
      invoiceDate,
      invoiceNo,
      prepaymentAmount,
      offsetAmount,
      hasArrived,
      hasAccepted,
      hasInvoice,
      hasPrepaymentOffset,
      status,
      remark,
    } = body;

    if (!title) {
      return NextResponse.json({ error: '采购事项名称(title)为必填项' }, { status: 400 });
    }

    // Validation
    await validateSupplierAndCategory(supplierId, categoryId);
    await validatePerson(requesterId, '需求提交人');
    await validatePerson(ownerId, '负责人');
    await validatePerson(salesPersonId, '销售/配合人员');

    if (!isValidEnum(currentStage, PURCHASE_STAGES)) {
      return NextResponse.json({ error: '无效的阶段' }, { status: 400 });
    }
    if (!isValidEnum(status, PURCHASE_STATUSES)) {
      return NextResponse.json({ error: '无效的状态' }, { status: 400 });
    }
    if (priority && !isValidEnum(priority, PRIORITIES)) {
      return NextResponse.json({ error: '无效的优先级' }, { status: 400 });
    }

    if (!isValidAmount(purchaseAmount) || !isValidAmount(prepaymentAmount) || !isValidAmount(offsetAmount)) {
      return NextResponse.json({ error: '金额必须为非负数' }, { status: 400 });
    }

    const parsedPrepaymentAmount = parseAmount(prepaymentAmount) || 0;
    const parsedOffsetAmount = parseAmount(offsetAmount) || 0;

    if (parsedOffsetAmount > parsedPrepaymentAmount) {
      return NextResponse.json({ error: '已抵充金额不能大于预付款金额' }, { status: 400 });
    }

    const item = await prisma.purchaseExecutionProcess.create({
      data: {
        title,
        supplierId,
        categoryId,
        requesterId,
        ownerId,
        salesPersonId: salesPersonId || null,
        currentStage,
        priority: priority || null,
        dueDate: parseDate(dueDate),
        currentProblem: currentProblem || null,
        nextAction: nextAction || null,
        needBossDecision: Boolean(needBossDecision),
        needPaymentRequest: Boolean(needPaymentRequest),
        purchaseAmount: parseAmount(purchaseAmount),
        contractNo: contractNo || null,
        contractDate: parseDate(contractDate),
        paymentRequestDate: parseDate(paymentRequestDate),
        arrivalDate: parseDate(arrivalDate),
        acceptanceDate: parseDate(acceptanceDate),
        invoiceDate: parseDate(invoiceDate),
        invoiceNo: invoiceNo || null,
        prepaymentAmount: parseAmount(prepaymentAmount),
        offsetAmount: parseAmount(offsetAmount),
        hasArrived: Boolean(hasArrived),
        hasAccepted: Boolean(hasAccepted),
        hasInvoice: Boolean(hasInvoice),
        hasPrepaymentOffset: Boolean(hasPrepaymentOffset),
        status,
        remark: remark || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating purchase process:', error);
    const message = error instanceof Error ? error.message : '创建失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
