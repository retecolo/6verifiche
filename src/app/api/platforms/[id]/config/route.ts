import { NextResponse } from 'next/server';
import { getPlatformById } from '@/lib/platform.service';
import {
  createConfigSnapshot,
  getConfigSnapshots,
} from '@/lib/config.service';
import { ConfigUploadSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const platform = await getPlatformById(id);
  if (!platform) {
    return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
  }
  const snapshots = await getConfigSnapshots(id);
  return NextResponse.json({ snapshots });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const platform = await getPlatformById(id);
  if (!platform) {
    return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get('config') as File | null;

  if (!file || typeof file === 'string') {
    return NextResponse.json(
      { error: 'Missing file field "config"' },
      { status: 400 }
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File exceeds 5 MB limit' },
      { status: 413 }
    );
  }

  const content = await file.text();
  const parsed = ConfigUploadSchema.safeParse({
    filename: file.name,
    content,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const snapshot = await createConfigSnapshot(id, parsed.data);
  return NextResponse.json(snapshot, { status: 201 });
}
