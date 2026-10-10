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
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser()
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
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    console.error('Error fetching purchase process:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser()
    const { id } = await params;
    const body = await request.json();

    // 获取现有记录，仅用 body 中存在的字段做合并覆盖
    const existing = await prisma.purchaseExecutionProcess.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    // 必填字段始终从 body 取
    const title = typeof body.title === 'string' ? body.title.trim() : existing.title;
    if (!title) {
      return NextResponse.json({ error: '采购事项名称(title)为必填项' }, { status: 400 });
    }

    // 必填外键始终从 body 取
    const supplierId = body.supplierId ?? existing.supplierId;
    const categoryId = body.categoryId ?? existing.categoryId;
    const requesterId = body.requesterId ?? existing.requesterId;
    const ownerId = body.ownerId ?? existing.ownerId;
    const currentStage = body.currentStage ?? existing.currentStage;
    const status = body.status ?? existing.status;

    // 验证必填外键和枚举
    await validateSupplierAndCategory(supplierId, categoryId);
    await validatePerson(requesterId, '需求提交人');
    await validatePerson(ownerId, '负责人');

    if (!isValidEnum(currentStage, PURCHASE_STAGES)) {
      return NextResponse.json({ error: '无效的阶段' }, { status: 400 });
    }
    if (!isValidEnum(status, PURCHASE_STATUSES)) {
      return NextResponse.json({ error: '无效的状态' }, { status: 400 });
    }

    // 可选字段 — 仅 body 中存在时覆盖，否则保留原值
    const data: Record<string, unknown> = {
      title, supplierId, categoryId, requesterId, ownerId, currentStage, status,
    };

    // 可选外键
    if ('salesPersonId' in body) {
      const v = body.salesPersonId || null;
      if (v) await validatePerson(v, '销售/配合人员');
      data.salesPersonId = v;
    }
    if ('priority' in body) {
      const v = body.priority || null;
      if (v && !isValidEnum(v, PRIORITIES)) {
        return NextResponse.json({ error: '无效的优先级' }, { status: 400 });
      }
      data.priority = v;
    }

    // 日期字段
    const dateFields = ['dueDate', 'contractDate', 'paymentRequestDate', 'arrivalDate', 'acceptanceDate', 'invoiceDate'] as const;
    for (const f of dateFields) {
      if (f in body) data[f] = parseDate(body[f]);
    }

    // 金额字段
    if ('purchaseAmount' in body) data.purchaseAmount = parseAmount(body.purchaseAmount);
    if ('prepaymentAmount' in body) data.prepaymentAmount = parseAmount(body.prepaymentAmount);
    if ('offsetAmount' in body) data.offsetAmount = parseAmount(body.offsetAmount);

    // 金额校验（用合并后的值）
    const finalPurchase = data.purchaseAmount ?? existing.purchaseAmount;
    const finalPrepayment = data.prepaymentAmount ?? existing.prepaymentAmount;
    const finalOffset = data.offsetAmount ?? existing.offsetAmount;
    if (!isValidAmount(finalPurchase) || !isValidAmount(finalPrepayment) || !isValidAmount(finalOffset)) {
      return NextResponse.json({ error: '金额必须为非负数' }, { status: 400 });
    }
    const numPrepayment = parseAmount(finalPrepayment) || 0;
    const numOffset = parseAmount(finalOffset) || 0;
    if (numOffset > numPrepayment) {
      return NextResponse.json({ error: '已抵充金额不能大于预付款金额' }, { status: 400 });
    }

    // 布尔字段 — 仅 body 中存在时覆盖
    const boolFields = ['needBossDecision', 'needPaymentRequest', 'hasArrived', 'hasAccepted', 'hasInvoice', 'hasPrepaymentOffset'] as const;
    for (const f of boolFields) {
      if (f in body) data[f] = Boolean(body[f]);
    }

    // 字符串字段 — 仅 body 中存在时覆盖
    const textFields = ['currentProblem', 'nextAction', 'contractNo', 'invoiceNo', 'remark', 'companyName'] as const;
    for (const f of textFields) {
      if (f in body) data[f] = body[f] || null;
    }

    const item = await prisma.purchaseExecutionProcess.update({
      where: { id },
      data,
    });

    return NextResponse.json(item);
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    console.error('Error updating purchase process:', error);
    const message = error instanceof Error ? error.message : '更新失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// PATCH semantics restricted
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser()
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
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    console.error('Error patching purchase process:', error);
    const message = error instanceof Error ? error.message : '部分更新失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
