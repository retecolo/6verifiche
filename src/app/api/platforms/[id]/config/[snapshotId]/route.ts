import { NextResponse } from 'next/server';
import {
  getConfigSnapshotById,
  deleteConfigSnapshot,
} from '@/lib/config.service';

type Params = { params: Promise<{ id: string; snapshotId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { snapshotId } = await params;
  const snapshot = await getConfigSnapshotById(snapshotId);
  if (!snapshot) {
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
  }
  return NextResponse.json(snapshot);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { snapshotId } = await params;
  const snapshot = await getConfigSnapshotById(snapshotId);
  if (!snapshot) {
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
  }
  await deleteConfigSnapshot(snapshotId);
  return new NextResponse(null, { status: 204 });
}
