import { NextResponse } from 'next/server';
import { listItems, createItem } from '../../../lib/data';

export async function GET() {
  const items = listItems();
  return NextResponse.json(items);
}

export async function POST(request) {
  const body = await request.json();
  if (!body || !body.title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }
  const item = createItem({ title: body.title, description: body.description || '' });
  return NextResponse.json(item, { status: 201 });
}
