// src/app/api/admin/batches-by-department/[deptCode]/route.ts
'use server';
import { type NextRequest, NextResponse } from 'next/server';
import { getFlaskBackend } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { deptCode: string } }
) {
  const cookie = request.headers.get('cookie');
  const res = await fetch(`${getFlaskBackend()}/admin/batches-by-department/${params.deptCode}`, {
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
