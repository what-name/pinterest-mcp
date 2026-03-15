/**
 * Keywords & Trends tools -- the differentiator no other Pinterest MCP has.
 * Enables keyword research, autocomplete, related terms, and trending topics.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { pinterestApi } from "../utils";

export function registerKeywordTools(
  server: McpServer,
  getAccessToken: () => string,
) {
  server.tool(
    "get_suggested_keywords",
    "Get Pinterest autocomplete suggestions for a search term. Returns what people actually type into Pinterest search. Great for discovering long-tail keywords.",
    {
      term: z.string().describe("Seed keyword (e.g., 'pet portrait', 'dog painting')"),
      limit: z.number().optional().describe("Max results (default 10)"),
    },
    async ({ term, limit }) => {
      const params: Record<string, string> = { term };
      if (limit) params.limit = String(limit);

      const data = await pinterestApi(
        getAccessToken(),
        "GET",
        "/terms/suggested",
        undefined,
        params,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_related_keywords",
    "Get semantically related terms for given keywords. Useful for expanding keyword research and finding related niches.",
    {
      terms: z
        .string()
        .describe("Comma-separated keywords to find related terms for (e.g., 'pet portrait,custom painting')"),
    },
    async ({ terms }) => {
      // Pinterest API expects terms as repeated query params
      const data = await pinterestApi(
        getAccessToken(),
        "GET",
        "/terms/related",
        undefined,
        { terms },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_trending_keywords",
    "Get trending keywords on Pinterest for a region. Shows growth rates (week-over-week, month-over-month, year-over-year). Great for finding emerging topics to create content for.",
    {
      region: z
        .enum(["US", "CA", "GB", "DE", "FR", "AU", "BR", "MX", "JP"])
        .describe("Country code for trends"),
      trend_type: z
        .enum(["growing", "monthly", "yearly", "seasonal"])
        .describe("Type of trend: growing (fastest rising), monthly, yearly, or seasonal"),
      interests: z
        .string()
        .optional()
        .describe("Filter by interest category (e.g., 'animals', 'home_decor')"),
      limit: z.number().optional().describe("Max results (default 50)"),
    },
    async ({ region, trend_type, interests, limit }) => {
      const params: Record<string, string> = {};
      if (interests) params.interests = interests;
      if (limit) params.limit = String(limit);

      const data = await pinterestApi(
        getAccessToken(),
        "GET",
        `/trends/keywords/${region}/top/${trend_type}`,
        undefined,
        params,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "search_pins",
    "Search public pins by keyword. Useful for competitive research and seeing what content performs well in your niche.",
    {
      query: z.string().describe("Search query"),
      bookmark: z.string().optional().describe("Pagination bookmark"),
    },
    async ({ query, bookmark }) => {
      const params: Record<string, string> = { query };
      if (bookmark) params.bookmark = bookmark;

      const data = await pinterestApi(
        getAccessToken(),
        "GET",
        "/search/pins",
        undefined,
        params,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
