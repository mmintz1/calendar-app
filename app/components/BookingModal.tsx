'use client';

import { useState } from 'react';
import { DateTime } from 'luxon';
import type { TimeRange } from '@/lib/types';

interface Props {
  slot: TimeRange;
  timezone: string;
  onClose: () => void;
  onBooked: () => void;
}

export default function BookingModal({ slot, timezone, onClose, onBooked }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = DateTime.fromISO(slot.start, { zone: timezone });
  const end = DateTime.fromISO(slot.end, { zone: timezone });
  const when = `${start.toFormat('cccc, LLL d')} · ${start.toFormat(
    'h:mm a'
  )} – ${end.toFormat('h:mm a')}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: slot.start, end: slot.end, name, email, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Booking failed');
      }
      onBooked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Book a time"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-xl font-bold">Book this time</h2>
        <p className="mb-5 font-semibold text-slate-500">{when}</p>

        <form onSubmit={submit}>
          <label className="mb-4 block text-sm font-semibold">
            Name
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal focus:border-blue-600 focus:outline-2 focus:outline-blue-600"
            />
          </label>
          <label className="mb-4 block text-sm font-semibold">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal focus:border-blue-600 focus:outline-2 focus:outline-blue-600"
            />
          </label>
          <label className="mb-4 block text-sm font-semibold">
            Notes <span className="font-normal text-slate-500">(optional)</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal focus:border-blue-600 focus:outline-2 focus:outline-blue-600"
            />
          </label>

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-100 px-5 py-2.5 font-semibold text-slate-900 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-default disabled:opacity-60"
            >
              {submitting ? 'Booking…' : 'Confirm booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
