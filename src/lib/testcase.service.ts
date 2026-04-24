import { prisma } from './prisma';
import type { TestCase } from '@prisma/client';
import type { TestCaseInput } from './validation';

export type TestCaseOut = Omit<TestCase, 'tags'> & { tags: string[] };

function fromDb(row: TestCase): TestCaseOut {
  return { ...row, tags: JSON.parse(row.tags) as string[] };
}

function toDb(data: TestCaseInput): Omit<TestCase, 'id'> {
  return { ...data, tags: JSON.stringify(data.tags), rfcReference: data.rfcReference ?? null };
}

function toDbPartial(data: Partial<TestCaseInput>): Partial<Omit<TestCase, 'id'>> {
  const { tags, rfcReference, ...rest } = data;
  return {
    ...rest,
    ...(tags !== undefined && { tags: JSON.stringify(tags) }),
    ...(rfcReference !== undefined && { rfcReference }),
  };
}

export async function getTestCases(page: number, limit: number) {
  const [rows, total] = await Promise.all([
    prisma.testCase.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.testCase.count(),
  ]);
  return { testCases: rows.map(fromDb), total, page, limit };
}

export async function getAllTestCases() {
  const rows = await prisma.testCase.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  return rows.map(fromDb);
}

export async function getTestCaseById(id: string) {
  const row = await prisma.testCase.findUnique({ where: { id } });
  return row ? fromDb(row) : null;
}

export async function createTestCase(data: TestCaseInput) {
  const row = await prisma.testCase.create({ data: toDb(data) });
  return fromDb(row);
}

export async function upsertTestCase(data: TestCaseInput) {
  const serialized = toDb(data);
  const { category, name, ...updateFields } = serialized;
  const row = await prisma.testCase.upsert({
    where: { category_name: { category, name } },
    update: updateFields,
    create: serialized,
  });
  return fromDb(row);
}

export async function updateTestCase(id: string, data: Partial<TestCaseInput>) {
  const row = await prisma.testCase.update({ where: { id }, data: toDbPartial(data) });
  return fromDb(row);
}

export async function deleteTestCase(id: string) {
  return prisma.testCase.delete({ where: { id } });
}

export async function getCategories(): Promise<string[]> {
  const rows = await prisma.testCase.findMany({
    distinct: ['category'],
    select: { category: true },
    orderBy: { category: 'asc' },
  });
  return rows.map((r) => r.category);
}

export async function getCategoryCounts(): Promise<{ category: string; count: number }[]> {
  const rows = await prisma.testCase.groupBy({
    by: ['category'],
    _count: { id: true },
    orderBy: { category: 'asc' },
  });
  return rows.map((r) => ({ category: r.category, count: r._count.id }));
}

export async function renameCategory(oldName: string, newName: string) {
  return prisma.testCase.updateMany({
    where: { category: oldName },
    data: { category: newName },
  });
}
