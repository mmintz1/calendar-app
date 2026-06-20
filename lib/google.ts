import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { config } from './config';
import { getRefreshToken } from './tokens';

/**
 * A bare OAuth2 client (no credentials). Used for generating the consent URL
 * and for exchanging the authorization code in the callback.
 */
export function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );
}

/**
 * An OAuth2 client primed with the owner's stored refresh token. googleapis
 * transparently uses it to obtain fresh access tokens on each call.
 *
 * Returns null when the owner has not connected their calendar yet.
 */
export async function getOwnerAuthClient(): Promise<OAuth2Client | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

/** Calendar v3 client bound to the owner's credentials, or null if unconnected. */
export async function getOwnerCalendar() {
  const auth = await getOwnerAuthClient();
  if (!auth) return null;
  return google.calendar({ version: 'v3', auth });
}
