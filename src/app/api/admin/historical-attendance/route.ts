// src/app/api/admin/historical-attendance/route.ts
'use server';
import { type NextRequest, NextResponse } from 'next/server';
import { getFlaskBackend } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie');
  const { searchParams } = new URL(request.url);

  // This endpoint can be used by admin, hod, or staff, so we use the admin backend route
  // The backend will handle scoping based on session if needed, but for now, it's open
  // as the primary filters (subject_id, batch_id) provide the necessary scoping.
  const res = await fetch(`${getFlaskBackend()}/admin/historical-attendance?${searchParams.toString()}`, {
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
