import { NextResponse } from 'next/server';
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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.purchaseExecutionProcess.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true } },
        salesPerson: { select: { id: true, name: true } },
      },
    });

    if (!item) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching purchase process:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    const item = await prisma.purchaseExecutionProcess.update({
      where: { id },
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

    return NextResponse.json(item);
  } catch (error: unknown) {
    console.error('Error updating purchase process:', error);
    const message = error instanceof Error ? error.message : '更新失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// PATCH semantics restricted
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const dataToUpdate: Record<string, unknown> = {};

    if (body.isArchived !== undefined) {
      dataToUpdate.isArchived = Boolean(body.isArchived);
      dataToUpdate.archivedAt = body.isArchived ? new Date() : null;
    }

    if (body.currentStage !== undefined) {
      if (!isValidEnum(body.currentStage, PURCHASE_STAGES)) {
        return NextResponse.json({ error: '无效的阶段' }, { status: 400 });
      }
      dataToUpdate.currentStage = body.currentStage;
    }

    if (body.status !== undefined) {
      if (!isValidEnum(body.status, PURCHASE_STATUSES)) {
        return NextResponse.json({ error: '无效的状态' }, { status: 400 });
      }
      dataToUpdate.status = body.status;
    }

    if (body.priority !== undefined) {
      if (body.priority && !isValidEnum(body.priority, PRIORITIES)) {
        return NextResponse.json({ error: '无效的优先级' }, { status: 400 });
      }
      dataToUpdate.priority = body.priority || null;
    }

    if (body.dueDate !== undefined) {
      dataToUpdate.dueDate = parseDate(body.dueDate);
    }

    if (body.needBossDecision !== undefined) dataToUpdate.needBossDecision = Boolean(body.needBossDecision);
    if (body.needPaymentRequest !== undefined) dataToUpdate.needPaymentRequest = Boolean(body.needPaymentRequest);

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    const item = await prisma.purchaseExecutionProcess.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(item);
  } catch (error: unknown) {
    console.error('Error patching purchase process:', error);
    const message = error instanceof Error ? error.message : '部分更新失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
