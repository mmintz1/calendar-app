/** Shared client/server shapes for the availability + booking API. */

export interface TimeRange {
  start: string;
  end: string;
}

export interface AvailabilityResponse {
  connected: boolean;
  busy: TimeRange[];
  slots: TimeRange[];
}

export interface BookRequest {
  start: string;
  end: string;
  name: string;
  email: string;
  notes?: string;
}

export interface BookResponse {
  ok: boolean;
  eventId?: string;
  htmlLink?: string;
  error?: string;
}
