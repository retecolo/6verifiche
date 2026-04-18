import { NextResponse } from 'next/server';
import { getResults, upsertResult } from '@/lib/result.service';
import { ResultSchema, PaginationSchema } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit } = PaginationSchema.parse({
      page: searchParams.get('page') ?? 1,
      limit: searchParams.get('limit') ?? 50,
    });
    const data = await getResults(page, limit);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ResultSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const result = await upsertResult(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
  }
}
