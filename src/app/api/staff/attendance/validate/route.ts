// src/app/api/staff/attendance/validate/route.ts
'use server';
import { type NextRequest, NextResponse } from 'next/server';
import { getFlaskBackend } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const cookie = request.headers.get('cookie');
  const body = await request.json();

  const res = await fetch(`${getFlaskBackend()}/staff/attendance/validate-absentees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie && { cookie }),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(data);
}
