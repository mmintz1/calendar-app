import { DateTime, Interval } from 'luxon';
import { config } from './config';

export interface TimeRange {
  /** ISO 8601 with offset, e.g. "2026-06-22T14:00:00.000-04:00" */
  start: string;
  end: string;
}

/**
 * Turn the owner's busy intervals into bookable free slots.
 *
 * For every day in [windowStart, windowEnd) we walk the configured business
 * hours in `slotMinutes` steps and keep a slot only if it is fully in the
 * future and does not overlap any busy interval. All day-boundary math is done
 * in the configured IANA timezone so DST transitions are handled correctly.
 */
export function computeFreeSlots(
  busy: TimeRange[],
  windowStartIso: string,
  windowEndIso: string,
  now: DateTime = DateTime.now()
): TimeRange[] {
  const zone = config.timezone;
  const { startHour, endHour, slotMinutes } = config.booking;

  const busyIntervals = busy.map((b) =>
    Interval.fromDateTimes(
      DateTime.fromISO(b.start, { zone }),
      DateTime.fromISO(b.end, { zone })
    )
  );

  const windowStart = DateTime.fromISO(windowStartIso, { zone });
  const windowEnd = DateTime.fromISO(windowEndIso, { zone });

  const slots: TimeRange[] = [];

  let day = windowStart.startOf('day');
  while (day < windowEnd) {
    const dayOpen = day.set({
      hour: startHour,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
    const dayClose = day.set({
      hour: endHour,
      minute: 0,
      second: 0,
      millisecond: 0,
    });

    let slotStart = dayOpen;
    while (slotStart < dayClose) {
      const slotEnd = slotStart.plus({ minutes: slotMinutes });
      if (slotEnd > dayClose) break;

      const slot = Interval.fromDateTimes(slotStart, slotEnd);
      const inFuture = slotStart > now;
      const inWindow = slotStart >= windowStart && slotEnd <= windowEnd;
      const overlapsBusy = busyIntervals.some((b) => b.overlaps(slot));

      if (inFuture && inWindow && !overlapsBusy) {
        slots.push({
          start: slotStart.toISO()!,
          end: slotEnd.toISO()!,
        });
      }

      slotStart = slotEnd;
    }

    day = day.plus({ days: 1 });
  }

  return slots;
}

/** True if [start, end) overlaps any busy interval. Used as the booking guard. */
export function isSlotBusy(
  busy: TimeRange[],
  startIso: string,
  endIso: string
): boolean {
  const zone = config.timezone;
  const slot = Interval.fromDateTimes(
    DateTime.fromISO(startIso, { zone }),
    DateTime.fromISO(endIso, { zone })
  );
  return busy.some((b) =>
    Interval.fromDateTimes(
      DateTime.fromISO(b.start, { zone }),
      DateTime.fromISO(b.end, { zone })
    ).overlaps(slot)
  );
}

/** Fetch busy intervals from Google FreeBusy for the owner's calendar. */
export async function fetchBusy(
  calendar: import('googleapis').calendar_v3.Calendar,
  timeMin: string,
  timeMax: string
): Promise<TimeRange[]> {
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      timeZone: config.timezone,
      items: [{ id: config.calendarId }],
    },
  });

  const busy = res.data.calendars?.[config.calendarId]?.busy ?? [];
  return busy
    .filter((b): b is { start: string; end: string } => !!b.start && !!b.end)
    .map((b) => ({ start: b.start, end: b.end }));
}
