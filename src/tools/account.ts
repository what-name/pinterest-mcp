/**
 * Account tools -- user info and account-level analytics.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { pinterestApi } from "../utils";

export function registerAccountTools(
  server: McpServer,
  getAccessToken: () => string,
) {
  server.tool(
    "get_account_info",
    "Get the authenticated Pinterest user's account information (username, account type, profile image, website URL).",
    {},
    async () => {
      const data = await pinterestApi(getAccessToken(), "GET", "/user_account");
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_account_analytics",
    "Get account-level analytics (impressions, saves, clicks, outbound clicks) for a date range. Max 90-day lookback. Metrics may be delayed up to 2 days.",
    {
      start_date: z
        .string()
        .describe("Start date in YYYY-MM-DD format"),
      end_date: z
        .string()
        .describe("End date in YYYY-MM-DD format"),
      metric_types: z
        .string()
        .optional()
        .describe(
          'Comma-separated metrics: IMPRESSION, SAVE, PIN_CLICK, OUTBOUND_CLICK, VIDEO_MRC_VIEW, VIDEO_AVG_WATCH_TIME. Default: all.',
        ),
    },
    async ({ start_date, end_date, metric_types }) => {
      const params: Record<string, string> = { start_date, end_date };
      if (metric_types) params.metric_types = metric_types;

      const data = await pinterestApi(
        getAccessToken(),
        "GET",
        "/user_account/analytics",
        undefined,
        params,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_top_pins_analytics",
    "Get the top 50 pins by performance for a date range. Useful for finding what's working. Sorted by engagement metrics.",
    {
      start_date: z.string().describe("Start date in YYYY-MM-DD format"),
      end_date: z.string().describe("End date in YYYY-MM-DD format"),
      sort_by: z
        .enum(["ENGAGEMENT", "IMPRESSION", "OUTBOUND_CLICK", "PIN_CLICK", "SAVE"])
        .describe("Metric to sort by"),
      metric_types: z
        .string()
        .optional()
        .describe("Comma-separated metrics: IMPRESSION, SAVE, PIN_CLICK, OUTBOUND_CLICK, ENGAGEMENT, ENGAGEMENT_RATE, OUTBOUND_CLICK_RATE, PIN_CLICK_RATE, SAVE_RATE"),
    },
    async ({ start_date, end_date, sort_by, metric_types }) => {
      const params: Record<string, string> = { start_date, end_date, sort_by };
      if (metric_types) params.metric_types = metric_types;

      const data = await pinterestApi(
        getAccessToken(),
        "GET",
        "/user_account/analytics/top_pins",
        undefined,
        params,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_multi_pin_analytics",
    "Get analytics for up to 100 pins at once. More efficient than calling get_pin_analytics one by one. Pass pin IDs as comma-separated string.",
    {
      pin_ids: z.string().describe("Comma-separated pin IDs (max 100)"),
      start_date: z.string().describe("Start date in YYYY-MM-DD format"),
      end_date: z.string().describe("End date in YYYY-MM-DD format"),
      metric_types: z
        .string()
        .describe("Comma-separated metrics: IMPRESSION, SAVE, PIN_CLICK, OUTBOUND_CLICK, VIDEO_MRC_VIEW, VIDEO_AVG_WATCH_TIME"),
    },
    async ({ pin_ids, start_date, end_date, metric_types }) => {
      const params: Record<string, string> = {
        start_date,
        end_date,
        metric_types,
        pin_ids,
        app_types: "ALL",
      };

      const data = await pinterestApi(
        getAccessToken(),
        "GET",
        "/pins/analytics",
        undefined,
        params,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
