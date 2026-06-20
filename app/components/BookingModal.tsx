'use client';

import { useState } from 'react';
import { DateTime } from 'luxon';
import type { TimeRange } from '@/lib/types';

interface Props {
  slot: TimeRange;
  onClose: () => void;
  onBooked: () => void;
}

export default function BookingModal({ slot, onClose, onBooked }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = DateTime.fromISO(slot.start);
  const end = DateTime.fromISO(slot.end);
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
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Book a time"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Book this time</h2>
        <p className="modal-when">{when}</p>

        <form onSubmit={submit}>
          <label>
            Name
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Notes <span className="optional">(optional)</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Booking…' : 'Confirm booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
