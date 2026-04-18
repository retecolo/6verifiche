import { NextResponse } from 'next/server';
import { getResultById, updateResult, deleteResult } from '@/lib/result.service';
import { ResultUpdateSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const result = await getResultById(id);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch result' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await getResultById(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const parsed = ResultUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const result = await updateResult(id, parsed.data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to update result' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await getResultById(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await deleteResult(id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete result' }, { status: 500 });
  }
}
