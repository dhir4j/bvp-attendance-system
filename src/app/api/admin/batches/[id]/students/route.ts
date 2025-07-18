// src/app/api/admin/batches/[id]/students/route.ts
'use server';
import { type NextRequest, NextResponse } from 'next/server';
import { getFlaskBackend } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookie = request.headers.get('cookie');
  const body = await request.json();
  const res = await fetch(`${getFlaskBackend()}/admin/batches/${params.id}/students`, {
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookie = request.headers.get('cookie');
  const body = await request.json(); // student_id should be in the body
  const res = await fetch(`${getFlaskBackend()}/admin/batches/${params.id}/students`, {
    method: 'DELETE',
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
