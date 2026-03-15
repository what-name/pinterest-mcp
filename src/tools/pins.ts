/**
 * Pin tools -- create, read, update, delete pins.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { pinterestApi } from "../utils";

export function registerPinTools(
  server: McpServer,
  getAccessToken: () => string,
) {
  server.tool(
    "create_pin",
    "Create a new image pin on Pinterest. The image must be a publicly accessible URL. Use publish_at for scheduling (ISO 8601 format). Title max 100 chars, description max 500 chars.",
    {
      board_id: z.string().describe("Board ID to pin to"),
      title: z.string().describe("Pin title (max 100 chars). Include keywords."),
      description: z.string().describe("Pin description (max 500 chars). Natural language with keywords."),
      link: z.string().describe("Destination URL when users click the pin"),
      image_url: z.string().describe("Publicly accessible image URL (JPEG, PNG, GIF, WEBP). Recommended: 1000x1500px (2:3 ratio)."),
      alt_text: z.string().optional().describe("Alt text for accessibility (max 500 chars)"),
      publish_at: z.string().optional().describe("Schedule pin for future: ISO 8601 datetime (e.g., 2026-04-01T14:30:00Z). Must be within 30 days."),
    },
    async ({ board_id, title, description, link, image_url, alt_text, publish_at }) => {
      const body: Record<string, unknown> = {
        board_id,
        title,
        description,
        link,
        media_source: {
          source_type: "image_url",
          url: image_url,
        },
      };
      if (alt_text) body.alt_text = alt_text;
      if (publish_at) body.publish_at = publish_at;

      const data = await pinterestApi(getAccessToken(), "POST", "/pins", body);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "create_carousel_pin",
    "Create a carousel pin with 2-5 images. Each image can have its own title and link.",
    {
      board_id: z.string().describe("Board ID to pin to"),
      title: z.string().describe("Pin title (max 100 chars)"),
      description: z.string().describe("Pin description (max 500 chars)"),
      items: z
        .string()
        .describe(
          'JSON array of carousel items: [{"title": "...", "description": "...", "link": "...", "image_url": "..."}]. 2-5 items.',
        ),
    },
    async ({ board_id, title, description, items }) => {
      const parsedItems = JSON.parse(items) as Array<{
        title?: string;
        description?: string;
        link?: string;
        image_url: string;
      }>;

      const body: Record<string, unknown> = {
        board_id,
        title,
        description,
        media_source: {
          source_type: "multiple_image_urls",
          items: parsedItems.map((item) => ({
            title: item.title,
            description: item.description,
            link: item.link,
            url: item.image_url,
          })),
        },
      };

      const data = await pinterestApi(getAccessToken(), "POST", "/pins", body);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_pin",
    "Get details of a specific pin by ID.",
    {
      pin_id: z.string().describe("Pin ID"),
    },
    async ({ pin_id }) => {
      const data = await pinterestApi(getAccessToken(), "GET", `/pins/${pin_id}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "update_pin",
    "Update a pin's title, description, link, or board. Cannot change the image.",
    {
      pin_id: z.string().describe("Pin ID"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      link: z.string().optional().describe("New destination URL"),
      board_id: z.string().optional().describe("Move pin to a different board"),
      alt_text: z.string().optional().describe("New alt text"),
    },
    async ({ pin_id, title, description, link, board_id, alt_text }) => {
      const body: Record<string, unknown> = {};
      if (title) body.title = title;
      if (description) body.description = description;
      if (link) body.link = link;
      if (board_id) body.board_id = board_id;
      if (alt_text) body.alt_text = alt_text;

      const data = await pinterestApi(getAccessToken(), "PATCH", `/pins/${pin_id}`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "delete_pin",
    "Delete a pin. This is irreversible.",
    {
      pin_id: z.string().describe("Pin ID to delete"),
    },
    async ({ pin_id }) => {
      await pinterestApi(getAccessToken(), "DELETE", `/pins/${pin_id}`);
      return {
        content: [{ type: "text", text: `Pin ${pin_id} deleted successfully.` }],
      };
    },
  );

  server.tool(
    "list_pins",
    "List the authenticated user's pins.",
    {
      page_size: z.number().optional().describe("Number of pins per page (max 250, default 25)"),
      bookmark: z.string().optional().describe("Pagination bookmark from previous response"),
    },
    async ({ page_size, bookmark }) => {
      const params: Record<string, string> = {};
      if (page_size) params.page_size = String(page_size);
      if (bookmark) params.bookmark = bookmark;

      const data = await pinterestApi(getAccessToken(), "GET", "/pins", undefined, params);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_pin_analytics",
    "Get analytics for a specific pin: impressions, saves, clicks, outbound clicks, video views. Max 90-day lookback. Metrics may be delayed up to 2 days.",
    {
      pin_id: z.string().describe("Pin ID"),
      start_date: z.string().describe("Start date in YYYY-MM-DD format"),
      end_date: z.string().describe("End date in YYYY-MM-DD format"),
      metric_types: z
        .string()
        .describe(
          'Comma-separated metrics: IMPRESSION, SAVE, PIN_CLICK, OUTBOUND_CLICK, VIDEO_MRC_VIEW, VIDEO_AVG_WATCH_TIME, TOTAL_COMMENTS',
        ),
    },
    async ({ pin_id, start_date, end_date, metric_types }) => {
      const params: Record<string, string> = {
        start_date,
        end_date,
        metric_types,
        app_types: "ALL",
      };

      const data = await pinterestApi(
        getAccessToken(),
        "GET",
        `/pins/${pin_id}/analytics`,
        undefined,
        params,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
