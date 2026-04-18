import { NextResponse } from 'next/server';
import { getTestCases, createTestCase } from '@/lib/testcase.service';
import { TestCaseSchema, PaginationSchema } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit } = PaginationSchema.parse({
      page: searchParams.get('page') ?? 1,
      limit: searchParams.get('limit') ?? 50,
    });
    const data = await getTestCases(page, limit);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch test cases' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = TestCaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const testCase = await createTestCase(parsed.data);
    return NextResponse.json(testCase, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create test case' }, { status: 500 });
  }
}
