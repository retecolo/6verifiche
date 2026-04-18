import { prisma } from './prisma';
import type { TestCaseInput } from './validation';

export async function getTestCases(page: number, limit: number) {
  const [testCases, total] = await Promise.all([
    prisma.testCase.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.testCase.count(),
  ]);
  return { testCases, total, page, limit };
}

export async function getAllTestCases() {
  return prisma.testCase.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
}

export async function getTestCaseById(id: string) {
  return prisma.testCase.findUnique({ where: { id } });
}

export async function createTestCase(data: TestCaseInput) {
  return prisma.testCase.create({ data });
}

export async function upsertTestCase(data: TestCaseInput) {
  return prisma.testCase.upsert({
    where: { category_name: { category: data.category, name: data.name } },
    update: { description: data.description },
    create: data,
  });
}

export async function updateTestCase(id: string, data: Partial<TestCaseInput>) {
  return prisma.testCase.update({ where: { id }, data });
}

export async function deleteTestCase(id: string) {
  return prisma.testCase.delete({ where: { id } });
}
