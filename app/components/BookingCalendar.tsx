'use client';

import { useCallback, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import luxonPlugin from '@fullcalendar/luxon3';
import type { DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';
import BookingModal from './BookingModal';
import type { AvailabilityResponse, TimeRange } from '@/lib/types';

interface Props {
  businessHours: { startHour: number; endHour: number };
  timezone: string;
  onConnectionChange: (connected: boolean) => void;
}

export default function BookingCalendar({
  businessHours,
  timezone,
  onConnectionChange,
}: Props) {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeRange | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  // FullCalendar's range title, rendered above the calendar box ourselves.
  const [title, setTitle] = useState('');
  // Remember the visible range so we can refetch after a booking.
  const rangeRef = useRef<{ start: string; end: string } | null>(null);

  const loadAvailability = useCallback(
    async (startIso: string, endIso: string) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/availability?start=${encodeURIComponent(
            startIso
          )}&end=${encodeURIComponent(endIso)}`
        );

        if (res.status === 409) {
          onConnectionChange(false);
          setEvents([]);
          return;
        }
        if (!res.ok) {
          setEvents([]);
          return;
        }

        const data: AvailabilityResponse = await res.json();
        onConnectionChange(data.connected);

        const busyEvents: EventInput[] = data.busy.map((b) => ({
          start: b.start,
          end: b.end,
          display: 'background',
          color: '#cbd5e1',
          title: 'Busy',
        }));

        const freeEvents: EventInput[] = data.slots.map((s) => ({
          start: s.start,
          end: s.end,
          title: 'Available',
          color: '#16a34a',
          // Keep the original API ISO strings (with the correct timezone offset)
          // so booking/display never depend on FullCalendar's date round-tripping.
          extendedProps: { kind: 'free' as const, rawStart: s.start, rawEnd: s.end },
        }));

        setEvents([...busyEvents, ...freeEvents]);
      } finally {
        setLoading(false);
      }
    },
    [onConnectionChange]
  );

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const start = arg.start.toISOString();
      const end = arg.end.toISOString();
      rangeRef.current = { start, end };
      setTitle(arg.view.title);
      void loadAvailability(start, end);
    },
    [loadAvailability]
  );

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const { kind, rawStart, rawEnd } = arg.event.extendedProps;
    if (kind !== 'free' || !rawStart || !rawEnd) return;
    setSelectedSlot({ start: rawStart, end: rawEnd });
  }, []);

  const handleBooked = useCallback(() => {
    setSelectedSlot(null);
    setConfirmation('Your booking is confirmed — check your email for the invite.');
    if (rangeRef.current) {
      void loadAvailability(rangeRef.current.start, rangeRef.current.end);
    }
  }, [loadAvailability]);

  return (
    <div>
      {title && (
        <h2 className="mb-3 text-xl font-semibold text-slate-900">{title}</h2>
      )}

      <div className="relative rounded-xl border border-slate-200 bg-white p-4">
        {confirmation && (
        <div
          className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800"
          role="status"
        >
          {confirmation}
          <button
            onClick={() => setConfirmation(null)}
            aria-label="Dismiss"
            className="text-2xl leading-none text-emerald-800 hover:text-emerald-900"
          >
            ×
          </button>
        </div>
      )}

      {loading && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/70 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <span
            className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-slate-600">
            Loading availability…
          </span>
        </div>
      )}

      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin, luxonPlugin]}
        initialView="timeGridWeek"
        timeZone={timezone}
        headerToolbar={{
          left: 'prev',
          center: 'today timeGridWeek,timeGridDay',
          right: 'next',
        }}
        allDaySlot={false}
        slotMinTime={`${String(businessHours.startHour).padStart(2, '0')}:00:00`}
        slotMaxTime={`${String(businessHours.endHour).padStart(2, '0')}:00:00`}
        nowIndicator
        weekends={false}
        height="auto"
        expandRows
        events={events}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
        eventClassNames={(arg) =>
          arg.event.extendedProps.kind === 'free'
            ? ['cursor-pointer', 'border-0!']
            : ['opacity-[0.85]']
        }
        />
      </div>

      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          timezone={timezone}
          onClose={() => setSelectedSlot(null)}
          onBooked={handleBooked}
        />
      )}
    </div>
  );
}
