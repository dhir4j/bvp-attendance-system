// src/app/api/admin/subjects/by-batch/[id]/route.ts
'use server';
import { type NextRequest, NextResponse } from 'next/server';
import { getFlaskBackend } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookie = request.headers.get('cookie');
  // This endpoint can be used by admin or hod, so we try both flask routes
  // The backend will handle the authorization based on session cookie.
  const adminUrl = `${getFlaskBackend()}/admin/subjects-by-batch/${params.id}`;
  const hodUrl = `${getFlaskBackend()}/hod/subjects-by-batch/${params.id}`;

  let res = await fetch(adminUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...(cookie && { cookie }),
    },
  });

  // If the admin route fails (e.g., 401 for HOD), try the HOD route.
  if (!res.ok && (res.status === 401 || res.status === 403)) {
     res = await fetch(hodUrl, {
        headers: {
            'Content-Type': 'application/json',
            ...(cookie && { cookie }),
        },
    });
  }

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.error || `Failed to fetch subjects. Status: ${res.status}`;
    return NextResponse.json({ error: errorMsg }, { status: res.status });
  }
  return NextResponse.json(data);
}
