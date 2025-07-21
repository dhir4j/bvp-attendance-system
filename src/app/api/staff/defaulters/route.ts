// src/app/api/staff/defaulters/route.ts
'use server';
import { type NextRequest, NextResponse } from 'next/server';
import { getFlaskBackend } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie');
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get('subject_id');
  const threshold = searchParams.get('threshold');

  if (!subjectId) {
    return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
  }

  const res = await fetch(`${getFlaskBackend()}/staff/defaulters?subject_id=${subjectId}&threshold=${threshold || 75}`, {
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
