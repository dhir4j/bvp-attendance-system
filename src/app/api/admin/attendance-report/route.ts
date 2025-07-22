// src/app/api/admin/attendance-report/route.ts
'use server';
import { type NextRequest, NextResponse } from 'next/server';
import { getFlaskBackend } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie');
  const { searchParams } = new URL(request.url);

  // Read all required parameters from the request
  const batchId = searchParams.get('batch_id');
  const subjectId = searchParams.get('subject_id');
  const lectureType = searchParams.get('lecture_type');

  if (!batchId || !subjectId || !lectureType) {
    return NextResponse.json({ error: 'batch_id, subject_id, and lecture_type are required' }, { status: 400 });
  }

  // Construct the backend URL with all parameters
  const backendUrl = new URL(`${getFlaskBackend()}/admin/attendance-report`);
  backendUrl.searchParams.append('batch_id', batchId);
  backendUrl.searchParams.append('subject_id', subjectId);
  backendUrl.searchParams.append('lecture_type', lectureType);

  const res = await fetch(backendUrl.toString(), {
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
