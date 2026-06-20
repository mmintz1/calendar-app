'use client';

import { useEffect, useState } from 'react';
import BookingCalendar from './BookingCalendar';
import ConnectBanner from './ConnectBanner';

interface Props {
  businessHours: { startHour: number; endHour: number };
  timezone: string;
  connectStatus: string | null;
}

/**
 * Client orchestrator: tracks connection state, shows the owner connect banner
 * when needed, and renders the booking calendar.
 */
export default function BookingPageClient({
  businessHours,
  timezone,
  connectStatus,
}: Props) {
  // null = unknown (still checking), boolean once resolved.
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setConnected(Boolean(d.connected));
      })
      .catch(() => {
        if (!cancelled) setConnected(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="page">
      <header className="page-header">
        <h1>Book a meeting</h1>
        <p>Pick an open slot below. Busy times are blocked out.</p>
      </header>

      {connected === false && <ConnectBanner connectStatus={connectStatus} />}
      {connectStatus === 'success' && (
        <div className="confirmation" role="status">
          Calendar connected successfully.
        </div>
      )}

      <BookingCalendar
        businessHours={businessHours}
        timezone={timezone}
        onConnectionChange={setConnected}
      />
    </main>
  );
}
