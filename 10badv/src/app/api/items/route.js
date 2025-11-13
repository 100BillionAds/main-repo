import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

export async function GET() {
  const items = await prisma.item.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(items);
}

export async function POST(request) {
  const body = await request.json();
  if (!body || !body.title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }
  const item = await prisma.item.create({ data: { title: body.title, description: body.description || '' } });
  return NextResponse.json(item, { status: 201 });
}
