// src/app/api/hod/assignments/[id]/route.ts
'use server';
import { type NextRequest, NextResponse } from 'next/server';
import { getFlaskBackend } from '@/lib/utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookie = request.headers.get('cookie');
  const res = await fetch(`${getFlaskBackend()}/hod/assignments/${params.id}`, {
    method: 'DELETE',
    headers: {
      ...(cookie && { cookie }),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  return NextResponse.json(data);
}

    