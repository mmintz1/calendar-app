'use client';

interface Props {
  connectStatus: string | null;
}

const STATUS_MESSAGES: Record<string, string> = {
  not_owner: 'That Google account is not the configured owner. Connect with the owner account.',
  no_refresh_token:
    'Google did not return a refresh token. Revoke access at myaccount.google.com/permissions and try again.',
  denied: 'Consent was denied.',
  error: 'Something went wrong connecting your calendar. Check the server logs.',
  missing_code: 'The OAuth callback was missing a code.',
};

/**
 * Owner-facing banner. Shown only when the calendar is not connected. Visitors
 * never need to act on it, but it explains why no slots are visible.
 */
export default function ConnectBanner({ connectStatus }: Props) {
  const message =
    connectStatus && STATUS_MESSAGES[connectStatus]
      ? STATUS_MESSAGES[connectStatus]
      : null;

  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center">
      <div>
        <strong>Calendar not connected.</strong>{' '}
        <span>If you are the owner, connect your Google Calendar to enable bookings.</span>
        {message && <p className="mt-2 text-sm text-amber-700">{message}</p>}
      </div>
      <a
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 sm:w-auto"
        href="/api/auth/google"
      >
        Connect Google Calendar
      </a>
    </div>
  );
}
