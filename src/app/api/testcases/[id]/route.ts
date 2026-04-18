import { NextResponse } from 'next/server';
import { getTestCaseById, updateTestCase, deleteTestCase } from '@/lib/testcase.service';
import { TestCaseSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const testCase = await getTestCaseById(id);
    if (!testCase) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(testCase);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch test case' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await getTestCaseById(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const parsed = TestCaseSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const testCase = await updateTestCase(id, parsed.data);
    return NextResponse.json(testCase);
  } catch {
    return NextResponse.json({ error: 'Failed to update test case' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await getTestCaseById(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await deleteTestCase(id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete test case' }, { status: 500 });
  }
}
