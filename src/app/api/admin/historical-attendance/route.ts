// This file is no longer needed as the historical-attendance route has been moved to a top-level API.
// It can be deleted, but for now, I will leave it empty to avoid breaking any other potential links.
// The new route is at /api/historical-attendance/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ error: 'This endpoint is deprecated. Please use /api/historical-attendance.' }, { status: 404 });
}
