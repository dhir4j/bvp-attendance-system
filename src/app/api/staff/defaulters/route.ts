// src/app/api/staff/defaulters/route.ts
'use server';
import { type NextRequest, NextResponse } from 'next/server';
import { getFlaskBackend } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie');
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get('batch_id');

  if (!batchId) {
    return NextResponse.json({ error: 'batch_id is required' }, { status: 400 });
  }

  const res = await fetch(`${getFlaskBackend()}/staff/attendance-report?batch_id=${batchId}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(cookie && { cookie }),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(data);
}
