import { NextResponse } from 'next/server';
import prisma from '../../../../lib/db';

export async function GET(request, { params }) {
  const item = await prisma.item.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(request, { params }) {
  const body = await request.json();
  try {
    const item = await prisma.item.update({ where: { id: params.id }, data: body });
    return NextResponse.json(item);
  } catch (e) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await prisma.item.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
