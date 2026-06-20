import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createOAuthClient } from '@/lib/google';
import { config } from '@/lib/config';
import { saveRefreshToken } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

/** Redirect home with a status flag the UI can surface to the owner. */
function home(req: NextRequest, status: string) {
  const url = new URL('/', req.url);
  url.searchParams.set('connect', status);
  return NextResponse.redirect(url);
}

/**
 * OAuth callback. Exchanges the code, verifies the consenting account is the
 * configured owner, and persists the refresh token. Any non-owner attempt is
 * rejected so a random visitor cannot hijack the bookable calendar.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error) return home(req, 'denied');
  if (!code) return home(req, 'missing_code');

  const oauth2 = createOAuthClient();

  try {
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    // Verify identity: only the owner may connect.
    const { data: userInfo } = await google
      .oauth2({ version: 'v2', auth: oauth2 })
      .userinfo.get();

    const email = userInfo.email?.toLowerCase();
    if (!email || email !== config.ownerEmail) {
      return home(req, 'not_owner');
    }

    if (!tokens.refresh_token) {
      // Happens if the account previously granted consent without `prompt`.
      // Revoke at https://myaccount.google.com/permissions and retry.
      return home(req, 'no_refresh_token');
    }

    await saveRefreshToken(tokens.refresh_token);
    return home(req, 'success');
  } catch (err) {
    console.error('OAuth callback failed:', err);
    return home(req, 'error');
  }
}
