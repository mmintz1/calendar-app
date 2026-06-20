import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { getOwnerCalendar } from '@/lib/google';
import { computeFreeSlots, fetchBusy } from '@/lib/availability';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/availability?start=ISO&end=ISO
 *
 * Returns the owner's busy blocks (opaque — no event details, via FreeBusy)
 * and the bookable free slots derived from the configured business hours.
 */
export async function GET(req: NextRequest) {
  const startParam = req.nextUrl.searchParams.get('start');
  const endParam = req.nextUrl.searchParams.get('end');

  if (!startParam || !endParam) {
    return NextResponse.json(
      { error: 'start and end query params (ISO 8601) are required' },
      { status: 400 }
    );
  }

  const start = DateTime.fromISO(startParam, { zone: config.timezone });
  const end = DateTime.fromISO(endParam, { zone: config.timezone });
  if (!start.isValid || !end.isValid || end <= start) {
    return NextResponse.json({ error: 'Invalid start/end range' }, { status: 400 });
  }

  const calendar = await getOwnerCalendar();
  if (!calendar) {
    return NextResponse.json(
      { error: 'Calendar not connected', connected: false },
      { status: 409 }
    );
  }

  try {
    const timeMin = start.toISO()!;
    const timeMax = end.toISO()!;
    const busy = await fetchBusy(calendar, timeMin, timeMax);
    const slots = computeFreeSlots(busy, timeMin, timeMax);

    return NextResponse.json({ connected: true, busy, slots });
  } catch (err) {
    console.error('availability error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 502 }
    );
  }
}
