import { prisma } from './prisma';
import type { PlatformInput } from './validation';

export async function getPlatforms(page: number, limit: number) {
  const [platforms, total] = await Promise.all([
    prisma.platform.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.platform.count(),
  ]);
  return { platforms, total, page, limit };
}

export async function getPlatformById(id: string) {
  return prisma.platform.findUnique({ where: { id } });
}

export async function getPlatformWithResults(id: string) {
  return prisma.platform.findUnique({
    where: { id },
    include: {
      results: {
        include: { testCase: true },
        orderBy: { testCase: { category: 'asc' } },
      },
    },
  });
}

export async function createPlatform(data: PlatformInput) {
  return prisma.platform.create({ data });
}

export async function updatePlatform(id: string, data: Partial<PlatformInput>) {
  return prisma.platform.update({ where: { id }, data });
}

export async function deletePlatform(id: string) {
  return prisma.platform.delete({ where: { id } });
}
