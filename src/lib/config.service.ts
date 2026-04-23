import { prisma } from './prisma';
import { ConfigUploadInput } from './validation';
import { findMatchingLines } from './config.keywords';

export async function createConfigSnapshot(
  platformId: string,
  data: ConfigUploadInput
) {
  return prisma.configSnapshot.create({
    data: { platformId, filename: data.filename, content: data.content },
  });
}

export async function getConfigSnapshots(platformId: string) {
  return prisma.configSnapshot.findMany({
    where: { platformId },
    orderBy: { uploadedAt: 'desc' },
    select: { id: true, filename: true, uploadedAt: true },
  });
}

export async function getConfigSnapshotById(id: string) {
  return prisma.configSnapshot.findUnique({ where: { id } });
}

export async function deleteConfigSnapshot(id: string) {
  return prisma.configSnapshot.delete({ where: { id } });
}

export async function getConfigWithMatches(
  snapshotId: string,
  testCaseName: string
) {
  const snapshot = await prisma.configSnapshot.findUnique({
    where: { id: snapshotId },
  });
  if (!snapshot) return null;
  const matchingLines = findMatchingLines(snapshot.content, testCaseName);
  return { snapshot, matchingLines };
}
