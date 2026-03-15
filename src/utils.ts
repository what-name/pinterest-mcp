/**
 * Pinterest OAuth helpers and types.
 *
 * Pinterest OAuth 2.0 specifics:
 * - Authorization URL: https://www.pinterest.com/oauth/
 * - Token URL: https://api.pinterest.com/v5/oauth/token
 * - Token exchange uses HTTP Basic auth (base64 of client_id:client_secret)
 * - Scopes are comma-separated (not space-separated like most OAuth providers)
 * - Access token expires in 30 days, refresh token in 60 days (continuous, refreshable indefinitely)
 * - Access tokens start with "pina_", refresh tokens with "pinr_"
 */

export const PINTEREST_AUTH_URL = "https://www.pinterest.com/oauth/";
export const PINTEREST_TOKEN_URL =
  "https://api.pinterest.com/v5/oauth/token";
export const PINTEREST_API_BASE = "https://api.pinterest.com/v5";

// Scopes we request -- covers pins, boards, account, and keywords/trends
export const PINTEREST_SCOPES =
  "ads:read,boards:read,boards:read_secret,boards:write,boards:write_secret,pins:read,pins:read_secret,pins:write,pins:write_secret,user_accounts:read";

/** Props stored encrypted in the MCP token. Available as this.props in tools. */
export type Props = {
  accessToken: string;
  refreshToken: string;
  username: string;
  scope: string;
};

/**
 * Build the Pinterest OAuth authorization URL.
 * Pinterest uses comma-separated scopes and a non-standard URL path.
 */
export function getPinterestAuthorizeUrl(options: {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
}): string {
  const url = new URL(PINTEREST_AUTH_URL);
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("scope", options.scope);
  url.searchParams.set("state", options.state);
  url.searchParams.set("response_type", "code");
  return url.href;
}

/**
 * Exchange an authorization code for Pinterest access + refresh tokens.
 * Pinterest requires HTTP Basic auth (base64 of client_id:client_secret).
 */
export async function exchangePinterestToken(options: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
}> {
  const basicAuth = btoa(`${options.clientId}:${options.clientSecret}`);

  const resp = await fetch(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: options.code,
      redirect_uri: options.redirectUri,
    }).toString(),
  });

  if (!resp.ok) {
    const error = await resp.text();
    throw new Error(`Pinterest token exchange failed (${resp.status}): ${error}`);
  }

  const data = (await resp.json()) as {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

/**
 * Refresh a Pinterest access token using the refresh token.
 * Same endpoint, same Basic auth, different grant_type.
 */
export async function refreshPinterestToken(options: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  scope: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const basicAuth = btoa(`${options.clientId}:${options.clientSecret}`);

  const resp = await fetch(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: options.refreshToken,
      scope: options.scope,
    }).toString(),
  });

  if (!resp.ok) {
    const error = await resp.text();
    throw new Error(`Pinterest token refresh failed (${resp.status}): ${error}`);
  }

  const data = (await resp.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || options.refreshToken,
    expiresIn: data.expires_in,
  };
}

/**
 * Fetch the authenticated user's Pinterest account info.
 * Used during OAuth callback to get the username for props.
 */
export async function fetchPinterestUser(accessToken: string): Promise<{
  username: string;
}> {
  const resp = await fetch(`${PINTEREST_API_BASE}/user_account`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const error = await resp.text();
    throw new Error(`Pinterest user fetch failed (${resp.status}): ${error}`);
  }

  const data = (await resp.json()) as { username: string };
  return { username: data.username };
}

/**
 * Make an authenticated request to the Pinterest API v5.
 * Used by all MCP tools.
 */
export async function pinterestApi(
  accessToken: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  queryParams?: Record<string, string>,
): Promise<unknown> {
  const url = new URL(`${PINTEREST_API_BASE}${path}`);
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  const init: RequestInit = { method, headers };

  if (body && (method === "POST" || method === "PATCH" || method === "PUT")) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const resp = await fetch(url.toString(), init);
  const text = await resp.text();

  if (!resp.ok) {
    throw new Error(`Pinterest API ${method} ${path} failed (${resp.status}): ${text}`);
  }

  // DELETE returns empty body
  if (!text) return { success: true };

  return JSON.parse(text);
}
