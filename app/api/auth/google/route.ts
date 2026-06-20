import { NextResponse } from 'next/server';
import { createOAuthClient } from '@/lib/google';
import { GOOGLE_SCOPES } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * Kick off the owner OAuth flow. Redirects to Google's consent screen.
 *
 * `access_type: offline` + `prompt: consent` guarantees Google returns a
 * refresh token (without prompt, a repeat consent omits it).
 */
export function GET() {
  const oauth2 = createOAuthClient();
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
  });
  return NextResponse.redirect(url);
}
