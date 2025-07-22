// src/app/api/admin/batches/route.ts
'use server';
import { type NextRequest, NextResponse } from 'next/server';
import { getFlaskBackend } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie');
  const res = await fetch(`${getFlaskBackend()}/admin/batches`, {
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

export async function POST(request: NextRequest) {
  const cookie = request.headers.get('cookie');
  const formData = await request.formData();

  const res = await fetch(`${getFlaskBackend()}/admin/batches`, {
    method: 'POST',
    headers: {
      ...(cookie && { cookie }),
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(data);
}
