import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  validateSupplierAndCategory,
  validatePerson,
  isValidEnum,
  parseDate,
} from '@/lib/workflow-validation';
import { DEVELOPMENT_STAGES, PRIORITIES, DEVELOPMENT_STATUSES } from '@/lib/workflow-constants';
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

export async function GET(request: Request) {
  try {
    await requireUser()
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const categoryId = searchParams.get('categoryId');
    const ownerId = searchParams.get('ownerId');
    const currentStage = searchParams.get('currentStage');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const needBossDecision = searchParams.get('needBossDecision');

    const where: Prisma.SupplierDevelopmentProcessWhereInput = { isArchived: false };

    if (supplierId) where.supplierId = supplierId;
    if (categoryId) where.categoryId = categoryId;
    if (ownerId) where.ownerId = ownerId;
    if (currentStage) where.currentStage = currentStage;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (needBossDecision === 'true') where.needBossDecision = true;

    const items = await prisma.supplierDevelopmentProcess.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        supplier: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    console.error('Error fetching development processes:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireUser()
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

    const item = await prisma.supplierDevelopmentProcess.create({
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

    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    console.error('Error creating development process:', error);
    const message = error instanceof Error ? error.message : '创建失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
