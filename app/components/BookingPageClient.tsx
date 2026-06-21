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
    <main className="mx-auto max-w-5xl px-5 pb-16 pt-8">
      <header>
        <h1 className="mb-1 text-3xl font-bold tracking-tight">
          Book a meeting
        </h1>
        <p className="mb-6 text-slate-500">
          Pick an open slot below. Busy times are blocked out.
        </p>
      </header>

      {connected === false && <ConnectBanner connectStatus={connectStatus} />}
      {connectStatus === 'success' && (
        <div
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800"
          role="status"
        >
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
