/**
 * Centralized environment + booking configuration.
 * Reading env access through here keeps the rest of the app testable and
 * surfaces missing variables with a clear error instead of a silent `undefined`.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". See .env.example.`
    );
  }
  return value;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable "${name}" must be an integer.`);
  }
  return parsed;
}

export const config = {
  google: {
    get clientId() {
      return required('GOOGLE_CLIENT_ID');
    },
    get clientSecret() {
      return required('GOOGLE_CLIENT_SECRET');
    },
    get redirectUri() {
      return required('GOOGLE_REDIRECT_URI');
    },
  },
  /** Only this account may connect as the bookable calendar. */
  get ownerEmail() {
    return required('OWNER_EMAIL').toLowerCase();
  },
  calendarId: process.env.CALENDAR_ID || 'primary',
  timezone: process.env.TIMEZONE || 'America/New_York',
  booking: {
    startHour: intEnv('BOOKING_START_HOUR', 9),
    endHour: intEnv('BOOKING_END_HOUR', 17),
    slotMinutes: intEnv('SLOT_MINUTES', 30),
  },
};

/** Google OAuth scopes. `email`/`openid` let us verify the owner's identity. */
export const GOOGLE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];
