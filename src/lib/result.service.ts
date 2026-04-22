import { prisma } from './prisma';
import type { ResultInput, ResultUpdateInput } from './validation';

export async function getResults(page: number, limit: number) {
  const [results, total] = await Promise.all([
    prisma.testResult.findMany({
      include: { platform: true, testCase: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.testResult.count(),
  ]);
  return { results, total, page, limit };
}

export async function getResultById(id: string) {
  return prisma.testResult.findUnique({
    where: { id },
    include: { platform: true, testCase: true },
  });
}

export async function getPlatformResultMatrix(platformId: string) {
  const [allTestCases, results] = await Promise.all([
    prisma.testCase.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
    prisma.testResult.findMany({
      where: { platformId },
      include: { testCase: true },
    }),
  ]);

  const resultMap = new Map(results.map(r => [r.testCaseId, r]));

  return allTestCases.map(tc => ({
    testCase: tc,
    result: resultMap.get(tc.id) ?? null,
  }));
}

export async function upsertResult(data: ResultInput) {
  const { platformId, testCaseId, ...updateFields } = data;
  return prisma.testResult.upsert({
    where: { platformId_testCaseId: { platformId, testCaseId } },
    update: updateFields,
    create: data,
    include: { platform: true, testCase: true },
  });
}

export async function updateResult(id: string, data: ResultUpdateInput) {
  return prisma.testResult.update({
    where: { id },
    data,
    include: { platform: true, testCase: true },
  });
}

export async function deleteResult(id: string) {
  return prisma.testResult.delete({ where: { id } });
}
