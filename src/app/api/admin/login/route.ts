// src/app/api/admin/login/route.ts
'use server';
import { type NextRequest, NextResponse } from 'next/server';
import { getFlaskBackend } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await fetch(`${getFlaskBackend()}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  const response = NextResponse.json(data);
  const sessionCookie = res.headers.get('set-cookie');
  if (sessionCookie) {
    response.headers.set('set-cookie', sessionCookie);
  }

  return response;
}
