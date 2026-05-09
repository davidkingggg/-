import { prisma } from './db';

export function isValidDate(dateStr: unknown): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

export function parseDate(dateStr: unknown): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return date;
}

export function isValidAmount(amount: unknown): boolean {
  if (amount === null || amount === undefined || amount === '') return true; // Optional fields can be empty
  const num = Number(amount);
  return !isNaN(num) && num >= 0;
}

export function parseAmount(amount: unknown): number | null {
  if (amount === null || amount === undefined || amount === '') return null;
  const num = Number(amount);
  if (isNaN(num)) return null;
  return num;
}

export function isValidEnum(value: unknown, enumArray: readonly string[]): boolean {
  if (typeof value !== 'string') return false;
  return enumArray.includes(value);
}

// Data consistency checks
export async function validateSupplierAndCategory(supplierId: string, categoryId: string) {
  if (!supplierId || !categoryId) {
    throw new Error('供应商和品类为必填项');
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { isArchived: true, categoryId: true },
  });

  if (!supplier) {
    throw new Error('指定的供应商不存在');
  }
  if (supplier.isArchived) {
    throw new Error('指定的供应商已归档');
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { isArchived: true },
  });

  if (!category) {
    throw new Error('指定的品类不存在');
  }
  if (category.isArchived) {
    throw new Error('指定的品类已归档');
  }

  // Optional: check if supplier's main category matches, though not strictly required by user, it's good practice.
  // Actually, user spec says "关联供应商和品类", maybe it can be a different category, so we don't block.
}

export async function validatePerson(personId: string | null | undefined, fieldName: string) {
  if (!personId) return; // Optional
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { isActive: true },
  });
  if (!person) {
    throw new Error(`指定的人员(${fieldName})不存在`);
  }
  if (!person.isActive) {
    throw new Error(`指定的人员(${fieldName})已停用`);
  }
}
