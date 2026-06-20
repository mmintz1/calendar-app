'use client';

import { useCallback, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
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
          extendedProps: { kind: 'free' as const },
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
      void loadAvailability(start, end);
    },
    [loadAvailability]
  );

  const handleEventClick = useCallback((arg: EventClickArg) => {
    if (arg.event.extendedProps.kind !== 'free') return;
    if (!arg.event.start || !arg.event.end) return;
    setSelectedSlot({
      start: arg.event.start.toISOString(),
      end: arg.event.end.toISOString(),
    });
  }, []);

  const handleBooked = useCallback(() => {
    setSelectedSlot(null);
    setConfirmation('Your booking is confirmed — check your email for the invite.');
    if (rangeRef.current) {
      void loadAvailability(rangeRef.current.start, rangeRef.current.end);
    }
  }, [loadAvailability]);

  return (
    <div className="calendar-wrap">
      {confirmation && (
        <div className="confirmation" role="status">
          {confirmation}
          <button onClick={() => setConfirmation(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {loading && <div className="loading">Loading availability…</div>}

      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        timeZone={timezone}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'timeGridWeek,timeGridDay',
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
          arg.event.extendedProps.kind === 'free' ? ['slot-free'] : ['slot-busy']
        }
      />

      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onBooked={handleBooked}
        />
      )}
    </div>
  );
}
