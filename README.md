# Pinterest MCP Server

Full-coverage Pinterest API v5 MCP server. Create pins, manage boards, research keywords, track analytics -- all from your AI assistant.

Hosted on Cloudflare Workers with OAuth 2.0 authentication. Each user authorizes their own Pinterest account.

Built by [by Lark](https://bylark.art).

## Quick Start

Add to Claude Code:

```bash
claude mcp add --transport http pinterest https://pinterest-mcp.orange-tooth-1f40.workers.dev/mcp
```

Then run `/mcp` inside Claude Code to authenticate with your Pinterest account.

## Tools (20)

### Pins

| Tool | Description |
|------|-------------|
| `create_pin` | Create image pin with title, description, link, board, alt text. Supports scheduling via `publish_at`. |
| `create_carousel_pin` | Create carousel pin with 2-5 images, each with own title/link. |
| `get_pin` | Get full details of a pin by ID. |
| `update_pin` | Update title, description, link, board, alt text. Cannot change image. |
| `delete_pin` | Delete a pin (irreversible). |
| `list_pins` | List all your pins (paginated). |
| `get_pin_analytics` | Per-pin metrics: impressions, saves, clicks, outbound clicks, video views. 90-day lookback. |

### Boards

| Tool | Description |
|------|-------------|
| `create_board` | Create board with name, description, privacy setting. |
| `list_boards` | List all boards with pin counts. |
| `update_board` | Update name, description, or privacy. |
| `delete_board` | Delete board and all its pins (irreversible). |
| `list_board_pins` | List all pins on a specific board. |

### Keywords & Search

| Tool | Description |
|------|-------------|
| `get_suggested_keywords` | Pinterest autocomplete suggestions for a search term. |
| `get_related_keywords` | Semantically related terms for keyword expansion. |
| `get_trending_keywords` | Trending keywords by region with growth rates (wow/mom/yoy) and full time series. |
| `search_pins` | Search public pins by keyword. |

### Analytics

| Tool | Description |
|------|-------------|
| `get_account_info` | Account details: username, type, profile image, website, follower count. |
| `get_account_analytics` | Account-level metrics over a date range. |
| `get_top_pins_analytics` | Top 50 pins by performance, sorted by engagement/impressions/saves/clicks. |
| `get_multi_pin_analytics` | Batch analytics for up to 100 pins at once. |

## Test Status

Tested against Pinterest API v5 with Trial access (March 15, 2026).

| Tool | Status | Notes |
|------|--------|-------|
| `get_account_info` | Pass | |
| `get_account_analytics` | Pass | |
| `list_boards` | Pass | |
| `list_board_pins` | Pass | |
| `create_board` | Pass | |
| `update_board` | Pass | |
| `delete_board` | Pass | |
| `get_pin` | Pass | |
| `list_pins` | Pass | |
| `get_top_pins_analytics` | Pass | Empty on new accounts (expected) |
| `get_trending_keywords` | Pass | Full time series data |
| `get_related_keywords` | Pass | |
| `get_suggested_keywords` | Partial | Returns limited results on Trial access |
| `search_pins` | Pass | May return empty on Trial |
| `create_pin` | Untested | Blocked by Trial access (needs Standard) |
| `update_pin` | Untested | Blocked by Trial access |
| `delete_pin` | Untested | Blocked by Trial access |
| `create_carousel_pin` | Untested | Blocked by Trial access |
| `get_pin_analytics` | Untested | Blocked by Trial access |
| `get_multi_pin_analytics` | Untested | Blocked by Trial access |

14/20 tools verified working. The 6 untested tools are blocked by Pinterest's Trial access restrictions on write operations and detailed analytics. They will work with Standard access.

## Deploy Your Own

### Prerequisites

- Cloudflare account (free tier works)
- Pinterest Business account
- Pinterest developer app ([developers.pinterest.com](https://developers.pinterest.com))

### Setup

1. Clone and install:

```bash
git clone https://github.com/what-name/pinterest-mcp.git
cd pinterest-mcp
npm install
```

2. Create a KV namespace:

```bash
wrangler kv namespace create "OAUTH_KV"
```

Copy the ID into `wrangler.jsonc`.

3. Copy `.dev.vars.example` to `.dev.vars` and fill in your Pinterest app credentials:

```bash
cp .dev.vars.example .dev.vars
```

4. Set secrets for production:

```bash
wrangler secret put PINTEREST_CLIENT_ID
wrangler secret put PINTEREST_CLIENT_SECRET
wrangler secret put COOKIE_ENCRYPTION_KEY
```

5. Add your Worker URL as a redirect URI in your Pinterest app settings:

```
https://your-worker.workers.dev/callback
```

6. Deploy:

```bash
wrangler deploy
```

### Pinterest API Access Tiers

| Tier | What works | How to get |
|------|-----------|------------|
| Trial | Read operations, boards, trends, keywords | Register app at developers.pinterest.com |
| Standard | Everything (pin creation, analytics, search) | Submit video demo of OAuth flow via "Upgrade access" |

## Architecture

```
MCP Client (Claude Code, Cursor, etc.)
  |
  | MCP protocol over HTTP
  |
Cloudflare Worker (this server)
  |-- OAuthProvider (handles MCP client auth)
  |-- PinterestHandler (Pinterest OAuth flow)
  |-- PinterestMCP (McpAgent with 20 tools)
  |     |-- tools/pins.ts
  |     |-- tools/boards.ts
  |     |-- tools/keywords.ts
  |     |-- tools/account.ts
  |
  | Pinterest API v5
  |
Pinterest
```

- **Auth:** OAuth 2.0 with PKCE. Each user authorizes their own Pinterest account. Tokens stored encrypted in Cloudflare KV.
- **Transport:** Streamable HTTP (MCP spec standard).
- **Token refresh:** Automatic. Pinterest access tokens expire in 30 days, refresh tokens in 60 days (continuous, refreshable indefinitely). The server handles upstream token refresh when the MCP client refreshes.

## Not Implemented (v1)

| Feature | Reason |
|---------|--------|
| Ads API (`/v5/ad_accounts`) | Add when needed |
| Catalogs API (`/v5/catalogs`) | Add when needed |
| Video pin upload | Complex two-step upload process. Image pins cover most use cases. |

## License

MIT
