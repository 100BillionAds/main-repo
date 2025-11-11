import { NextResponse } from 'next/server';
import { getItem, updateItem, deleteItem } from '../../../../lib/data';

export async function GET(request, { params }) {
  const item = getItem(params.id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(request, { params }) {
  const body = await request.json();
  const item = updateItem(params.id, body);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(request, { params }) {
  const ok = deleteItem(params.id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
