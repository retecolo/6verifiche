import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const platforms = await prisma.platform.findMany({
      include: {
        results: {
          include: { testCase: true }
        }
      }
    });
    return NextResponse.json(platforms);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch platforms' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const platform = await prisma.platform.create({
      data: {
        vendor: body.vendor,
        modelName: body.modelName,
        osVersion: body.osVersion,
      }
    });
    return NextResponse.json(platform, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create platform' }, { status: 500 });
  }
}
