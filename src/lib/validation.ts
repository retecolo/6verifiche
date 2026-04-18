import { z } from 'zod';

export const PlatformSchema = z.object({
  vendor: z.string().min(1).max(100).trim(),
  modelName: z.string().min(1).max(150).trim(),
  osVersion: z.string().min(1).max(100).trim(),
});

export const TestCaseSchema = z.object({
  category: z.string().min(1).max(100).trim(),
  name: z.string().min(1).max(150).trim(),
  description: z.string().min(1).max(2000).trim(),
});

export const ResultStatus = z.enum(['PASS', 'FAIL', 'PARTIAL', 'N/A']);

export const ResultSchema = z.object({
  platformId: z.string().cuid(),
  testCaseId: z.string().cuid(),
  status: ResultStatus,
  detail: z.string().max(2000).trim().optional(),
});

export const ResultUpdateSchema = z.object({
  status: ResultStatus,
  detail: z.string().max(2000).trim().optional(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type PlatformInput = z.infer<typeof PlatformSchema>;
export type TestCaseInput = z.infer<typeof TestCaseSchema>;
export type ResultInput = z.infer<typeof ResultSchema>;
export type ResultUpdateInput = z.infer<typeof ResultUpdateSchema>;
