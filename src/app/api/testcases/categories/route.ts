import { NextResponse } from 'next/server';
import { getCategoryCounts, renameCategory } from '@/lib/testcase.service';
import { z } from 'zod';

const RenameSchema = z.object({
  oldName: z.string().min(1).max(100).trim(),
  newName: z.string().min(1).max(100).trim(),
});

export async function GET() {
  try {
    const data = await getCategoryCounts();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = RenameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { oldName, newName } = parsed.data;
    if (oldName === newName) {
      return NextResponse.json({ count: 0 });
    }
    const result = await renameCategory(oldName, newName);
    return NextResponse.json({ count: result.count });
  } catch {
    return NextResponse.json({ error: 'Failed to rename category' }, { status: 500 });
  }
}
