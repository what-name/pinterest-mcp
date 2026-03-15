/**
 * Pinterest MCP Server
 *
 * Full-coverage Pinterest API v5 MCP server.
 * Remote Cloudflare Worker with OAuth 2.0 authentication via Pinterest.
 *
 * Architecture:
 * - OAuthProvider wraps the Worker, handling MCP client auth
 * - PinterestHandler manages the Pinterest OAuth flow (authorize/callback)
 * - PinterestMCP (McpAgent) defines all MCP tools
 * - Pinterest access tokens stored encrypted in props, passed to tools
 *
 * Tools: 18 tools covering pins, boards, keywords/trends, analytics, and search.
 */

import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { PinterestHandler } from "./pinterest-handler";
import { refreshPinterestToken, type Props } from "./utils";
import { registerAccountTools } from "./tools/account";
import { registerBoardTools } from "./tools/boards";
import { registerPinTools } from "./tools/pins";
import { registerKeywordTools } from "./tools/keywords";

export class PinterestMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({
    name: "Pinterest MCP",
    version: "0.1.0",
  });

  async init() {
    const getAccessToken = () => this.props!.accessToken;

    registerAccountTools(this.server, getAccessToken);
    registerBoardTools(this.server, getAccessToken);
    registerPinTools(this.server, getAccessToken);
    registerKeywordTools(this.server, getAccessToken);
  }
}

export default new OAuthProvider({
  apiHandler: PinterestMCP.serve("/mcp"),
  apiRoute: "/mcp",
  defaultHandler: PinterestHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",

  // Handle upstream Pinterest token refresh when MCP client refreshes
  tokenExchangeCallback: async (options) => {
    if (options.grantType === "authorization_code") {
      // Initial token exchange -- props already contain Pinterest tokens
      // from completeAuthorization in the callback handler
      return {
        accessTokenTTL: 2592000, // 30 days, match Pinterest's TTL
      };
    }

    if (options.grantType === "refresh_token") {
      // MCP client is refreshing -- refresh the upstream Pinterest token too
      const props = options.props as Props;

      try {
        // Access env vars via the cloudflare:workers module
        const { env } = await import("cloudflare:workers");
        const tokens = await refreshPinterestToken({
          clientId: env.PINTEREST_CLIENT_ID,
          clientSecret: env.PINTEREST_CLIENT_SECRET,
          refreshToken: props.refreshToken,
          scope: props.scope,
        });

        return {
          accessTokenProps: {
            ...props,
            accessToken: tokens.accessToken,
          },
          newProps: {
            ...props,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          },
          accessTokenTTL: tokens.expiresIn,
        };
      } catch (error) {
        console.error("Pinterest token refresh failed:", error);
        // Return unchanged props -- the user will need to re-authorize
        return {};
      }
    }
  },
});
