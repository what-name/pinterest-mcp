/**
 * Board tools -- CRUD for Pinterest boards.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { pinterestApi } from "../utils";

export function registerBoardTools(
  server: McpServer,
  getAccessToken: () => string,
) {
  server.tool(
    "list_boards",
    "List all boards for the authenticated user. Returns board IDs, names, descriptions, and pin counts.",
    {
      page_size: z.number().optional().describe("Number of boards per page (max 250, default 25)"),
      bookmark: z.string().optional().describe("Pagination bookmark from previous response"),
    },
    async ({ page_size, bookmark }) => {
      const params: Record<string, string> = {};
      if (page_size) params.page_size = String(page_size);
      if (bookmark) params.bookmark = bookmark;

      const data = await pinterestApi(getAccessToken(), "GET", "/boards", undefined, params);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "create_board",
    "Create a new Pinterest board. Board names should be keyword-rich for discoverability.",
    {
      name: z.string().describe("Board name (max 50 chars)"),
      description: z.string().optional().describe("Board description with keywords (max 500 chars)"),
      privacy: z.enum(["PUBLIC", "PROTECTED", "SECRET"]).optional().describe("Board privacy. Default: PUBLIC"),
    },
    async ({ name, description, privacy }) => {
      const body: Record<string, unknown> = { name };
      if (description) body.description = description;
      if (privacy) body.privacy = privacy;

      const data = await pinterestApi(getAccessToken(), "POST", "/boards", body);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "update_board",
    "Update a board's name, description, or privacy setting.",
    {
      board_id: z.string().describe("Board ID"),
      name: z.string().optional().describe("New board name"),
      description: z.string().optional().describe("New board description"),
      privacy: z.enum(["PUBLIC", "PROTECTED", "SECRET"]).optional().describe("New privacy setting"),
    },
    async ({ board_id, name, description, privacy }) => {
      const body: Record<string, unknown> = {};
      if (name) body.name = name;
      if (description) body.description = description;
      if (privacy) body.privacy = privacy;

      const data = await pinterestApi(getAccessToken(), "PATCH", `/boards/${board_id}`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "delete_board",
    "Delete a board and all its pins. This is irreversible.",
    {
      board_id: z.string().describe("Board ID to delete"),
    },
    async ({ board_id }) => {
      await pinterestApi(getAccessToken(), "DELETE", `/boards/${board_id}`);
      return {
        content: [{ type: "text", text: `Board ${board_id} deleted successfully.` }],
      };
    },
  );

  server.tool(
    "list_board_pins",
    "List all pins on a specific board.",
    {
      board_id: z.string().describe("Board ID"),
      page_size: z.number().optional().describe("Number of pins per page (max 250, default 25)"),
      bookmark: z.string().optional().describe("Pagination bookmark from previous response"),
    },
    async ({ board_id, page_size, bookmark }) => {
      const params: Record<string, string> = {};
      if (page_size) params.page_size = String(page_size);
      if (bookmark) params.bookmark = bookmark;

      const data = await pinterestApi(
        getAccessToken(),
        "GET",
        `/boards/${board_id}/pins`,
        undefined,
        params,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
