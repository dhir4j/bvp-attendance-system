// src/app/api/admin/attendance-report/route.ts
'use server';
import { type NextRequest, NextResponse } from 'next/server';
import { getFlaskBackend } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie');
  const { searchParams } = new URL(request.url);
  const classroomId = searchParams.get('classroom_id');

  if (!classroomId) {
    return NextResponse.json({ error: 'classroom_id is required' }, { status: 400 });
  }

  const res = await fetch(`${getFlaskBackend()}/admin/attendance-report?classroom_id=${classroomId}`, {
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
