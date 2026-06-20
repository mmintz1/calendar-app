import { NextResponse } from 'next/server';
import { isConnected } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

/** Reports whether the owner has connected a calendar. Drives the UI banner. */
export async function GET() {
  try {
    return NextResponse.json({ connected: await isConnected() });
  } catch {
    // KV not configured / unreachable — treat as not connected.
    return NextResponse.json({ connected: false });
  }
}
