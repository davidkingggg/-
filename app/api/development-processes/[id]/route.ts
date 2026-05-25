import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  validateSupplierAndCategory,
  validatePerson,
  isValidEnum,
  parseDate,
} from '@/lib/workflow-validation';
import { DEVELOPMENT_STAGES, PRIORITIES, DEVELOPMENT_STATUSES } from '@/lib/workflow-constants';
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser()
    const { id } = await params;
    const item = await prisma.supplierDevelopmentProcess.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
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
    console.error('Error fetching development process:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser()
    const { id } = await params;
    const body = await request.json();
    const {
      supplierId,
      categoryId,
      currentStage,
      ownerId,
      priority,
      dueDate,
      currentProblem,
      nextAction,
      needBossDecision,
      needSalesSupport,
      needBusinessAssistantSupport,
      status,
      remark,
    } = body;

    // Validation
    await validateSupplierAndCategory(supplierId, categoryId);
    await validatePerson(ownerId, '负责人');

    if (!isValidEnum(currentStage, DEVELOPMENT_STAGES)) {
      return NextResponse.json({ error: '无效的阶段' }, { status: 400 });
    }
    if (!isValidEnum(status, DEVELOPMENT_STATUSES)) {
      return NextResponse.json({ error: '无效的状态' }, { status: 400 });
    }
    if (priority && !isValidEnum(priority, PRIORITIES)) {
      return NextResponse.json({ error: '无效的优先级' }, { status: 400 });
    }

    const item = await prisma.supplierDevelopmentProcess.update({
      where: { id },
      data: {
        supplierId,
        categoryId,
        currentStage,
        ownerId,
        priority: priority || null,
        dueDate: parseDate(dueDate),
        currentProblem: currentProblem || null,
        nextAction: nextAction || null,
        needBossDecision: Boolean(needBossDecision),
        needSalesSupport: Boolean(needSalesSupport),
        needBusinessAssistantSupport: Boolean(needBusinessAssistantSupport),
        status,
        remark: remark || null,
      },
    });

    return NextResponse.json(item);
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    console.error('Error updating development process:', error);
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
      if (!isValidEnum(body.currentStage, DEVELOPMENT_STAGES)) {
        return NextResponse.json({ error: '无效的阶段' }, { status: 400 });
      }
      dataToUpdate.currentStage = body.currentStage;
    }

    if (body.status !== undefined) {
      if (!isValidEnum(body.status, DEVELOPMENT_STATUSES)) {
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

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    const item = await prisma.supplierDevelopmentProcess.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(item);
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    console.error('Error patching development process:', error);
    const message = error instanceof Error ? error.message : '部分更新失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
