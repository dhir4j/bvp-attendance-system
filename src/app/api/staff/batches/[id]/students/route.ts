// src/app/api/staff/batches/[id]/students/route.ts
'use server';
import { type NextRequest, NextResponse } from 'next/server';
import { getFlaskBackend } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookie = request.headers.get('cookie');
  const res = await fetch(`${getFlaskBackend()}/staff/batches/${params.id}/students`, {
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
