// src/app/api/admin/departments/route.ts
'use server';
import { type NextRequest, NextResponse } from 'next/server';
import { getFlaskBackend } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie');
  const res = await fetch(`${getFlaskBackend()}/admin/departments`, {
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
