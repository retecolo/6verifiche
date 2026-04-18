import { NextResponse } from 'next/server';
import { getPlatformById, getPlatformWithResults, updatePlatform, deletePlatform } from '@/lib/platform.service';
import { PlatformSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const platform = await getPlatformWithResults(id);
    if (!platform) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(platform);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch platform' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await getPlatformById(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const parsed = PlatformSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const platform = await updatePlatform(id, parsed.data);
    return NextResponse.json(platform);
  } catch {
    return NextResponse.json({ error: 'Failed to update platform' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await getPlatformById(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await deletePlatform(id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete platform' }, { status: 500 });
  }
}
