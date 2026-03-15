/**
 * Pinterest OAuth handler.
 *
 * Handles the OAuth flow between the MCP client and Pinterest:
 * 1. GET /authorize -- redirect to Pinterest consent screen
 * 2. GET /callback -- exchange auth code for tokens, complete MCP authorization
 *
 * Based on Cloudflare's GitHub OAuth MCP example pattern.
 */

import { Hono } from "hono";
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import {
  getPinterestAuthorizeUrl,
  exchangePinterestToken,
  fetchPinterestUser,
  PINTEREST_SCOPES,
  type Props,
} from "./utils";

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

/**
 * GET /authorize
 *
 * MCP client redirects here. We parse the MCP auth request,
 * store state in KV, and redirect to Pinterest's OAuth consent screen.
 */
app.get("/authorize", async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  if (!oauthReqInfo.clientId) {
    return c.text("Invalid OAuth request", 400);
  }

  // Generate random state for CSRF protection
  const state = crypto.randomUUID();

  // Store the MCP auth request info in KV so we can retrieve it in /callback
  await c.env.OAUTH_KV.put(
    `oauth_state:${state}`,
    JSON.stringify(oauthReqInfo),
    { expirationTtl: 600 }, // 10 minutes
  );

  // Redirect to Pinterest
  const callbackUrl = new URL("/callback", c.req.url).href;
  const authorizeUrl = getPinterestAuthorizeUrl({
    clientId: c.env.PINTEREST_CLIENT_ID,
    redirectUri: callbackUrl,
    scope: PINTEREST_SCOPES,
    state,
  });

  return c.redirect(authorizeUrl);
});

/**
 * GET /callback
 *
 * Pinterest redirects back here after user authorizes.
 * We exchange the code for tokens, fetch user info, and complete MCP authorization.
 */
app.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code || !state) {
    return c.text("Missing code or state parameter", 400);
  }

  // Retrieve and validate the stored OAuth request info
  const stored = await c.env.OAUTH_KV.get(`oauth_state:${state}`);
  if (!stored) {
    return c.text("Invalid or expired state. Please try again.", 400);
  }

  // Clean up the state from KV
  await c.env.OAUTH_KV.delete(`oauth_state:${state}`);

  const oauthReqInfo = JSON.parse(stored);

  // Exchange the authorization code for Pinterest tokens
  const callbackUrl = new URL("/callback", c.req.url).href;
  const tokens = await exchangePinterestToken({
    clientId: c.env.PINTEREST_CLIENT_ID,
    clientSecret: c.env.PINTEREST_CLIENT_SECRET,
    code,
    redirectUri: callbackUrl,
  });

  // Fetch user info for the props
  const user = await fetchPinterestUser(tokens.accessToken);

  // Complete the MCP authorization flow.
  // The access token and refresh token are stored encrypted in props,
  // available as this.props in McpAgent tools.
  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReqInfo,
    userId: user.username,
    metadata: { label: user.username },
    scope: oauthReqInfo.scope,
    props: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      username: user.username,
      scope: tokens.scope,
    } as Props,
  });

  return c.redirect(redirectTo);
});

/**
 * Catch-all for the root -- simple landing page.
 */
app.get("/", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head><title>Pinterest MCP Server</title></head>
    <body style="font-family: system-ui; max-width: 600px; margin: 80px auto; padding: 0 20px;">
      <h1>Pinterest MCP Server</h1>
      <p>Full-coverage Pinterest API v5 MCP server for AI assistants.</p>
      <p>Connect your MCP client to <code>${new URL("/mcp", c.req.url).href}</code></p>
      <p style="margin-top: 40px; color: #888; font-size: 14px;">
        Built by <a href="https://bylark.art">by Lark</a> |
        <a href="https://github.com/what-name/pinterest-mcp">Source on GitHub</a>
      </p>
    </body>
    </html>
  `);
});

export { app as PinterestHandler };
