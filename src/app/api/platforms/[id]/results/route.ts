import { NextResponse } from 'next/server';
import { getPlatformById } from '@/lib/platform.service';
import { getPlatformResultMatrix } from '@/lib/result.service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const platform = await getPlatformById(id);
    if (!platform) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const matrix = await getPlatformResultMatrix(id);
    return NextResponse.json({ platform, matrix });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch results matrix' }, { status: 500 });
  }
}
