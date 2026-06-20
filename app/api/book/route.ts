import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { getOwnerCalendar } from '@/lib/google';
import { computeFreeSlots, fetchBusy } from '@/lib/availability';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

interface BookBody {
  start?: string;
  end?: string;
  name?: string;
  email?: string;
  notes?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/book — create an event on the owner's calendar for a chosen slot.
 *
 * Before inserting we re-derive the bookable slots from a fresh FreeBusy query
 * and confirm the requested slot is still offered. This single check enforces
 * business hours, slot alignment, future-only, AND guards against a race where
 * the slot was taken between page load and submit (no double-booking).
 */
export async function POST(req: NextRequest) {
  let body: BookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { start, end, name, email, notes } = body;

  if (!start || !end || !name?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: 'start, end, name and email are required' },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const startDt = DateTime.fromISO(start, { zone: config.timezone });
  const endDt = DateTime.fromISO(end, { zone: config.timezone });
  if (!startDt.isValid || !endDt.isValid || endDt <= startDt) {
    return NextResponse.json({ error: 'Invalid start/end' }, { status: 400 });
  }

  const calendar = await getOwnerCalendar();
  if (!calendar) {
    return NextResponse.json(
      { error: 'Calendar not connected' },
      { status: 409 }
    );
  }

  try {
    // Re-validate against live availability for the requested day.
    const dayStart = startDt.startOf('day').toISO()!;
    const dayEnd = startDt.endOf('day').toISO()!;
    const busy = await fetchBusy(calendar, dayStart, dayEnd);
    const slots = computeFreeSlots(busy, dayStart, dayEnd);

    const isOffered = slots.some(
      (s) =>
        DateTime.fromISO(s.start).equals(startDt) &&
        DateTime.fromISO(s.end).equals(endDt)
    );
    if (!isOffered) {
      return NextResponse.json(
        { error: 'That slot is no longer available. Please pick another.' },
        { status: 409 }
      );
    }

    const event = await calendar.events.insert({
      calendarId: config.calendarId,
      sendUpdates: 'all',
      requestBody: {
        summary: `Booking: ${name.trim()}`,
        description: [
          `Booked via the booking page.`,
          `Name: ${name.trim()}`,
          `Email: ${email.trim()}`,
          notes?.trim() ? `Notes: ${notes.trim()}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        start: { dateTime: startDt.toISO()!, timeZone: config.timezone },
        end: { dateTime: endDt.toISO()!, timeZone: config.timezone },
        attendees: [{ email: email.trim(), displayName: name.trim() }],
      },
    });

    return NextResponse.json({
      ok: true,
      eventId: event.data.id,
      htmlLink: event.data.htmlLink,
    });
  } catch (err) {
    console.error('book error:', err);
    return NextResponse.json(
      { error: 'Failed to create the booking' },
      { status: 502 }
    );
  }
}
