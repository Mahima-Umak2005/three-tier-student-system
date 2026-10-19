/** @format */

// MCP server for the Student Information Management System.
// Communicates with the Render REST API, never directly with MongoDB.

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  StreamableHTTPServerTransport,
} = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { z } = require("zod");

const API_BASE_URL = (
  process.env.API_BASE_URL || "https://three-tier-student-system.onrender.com"
).replace(/\/+$/, "");

const API = API_BASE_URL + "/api/students";

async function call(path = "", method = "GET", body) {
  try {
    const res = await fetch(API + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60000),
    });

    const json = await res.json().catch(() => ({}));

    return {
      content: [{ type: "text", text: JSON.stringify(json, null, 2) }],
      isError: !res.ok,
    };
  } catch (e) {
    return {
      content: [
        { type: "text", text: `Could not reach the backend: ${e.message}` },
      ],
      isError: true,
    };
  }
}

const studentFields = {
  name: z.string().min(1).describe("Full name"),
  email: z.string().email(),
  department: z.string().min(1).describe("e.g. Computer Science"),
  semester: z.number().int().min(1).max(12),
  contact: z
    .string()
    .regex(/^\d{10}$/)
    .optional()
    .describe("10-digit phone number"),
};

function buildServer() {
  const server = new McpServer({
    name: "student-management",
    version: "1.0.0",
  });

  server.tool(
    "list_students",
    "List all student records. Optionally filter by ID, name, email, or department.",
    { search: z.string().optional() },
    async ({ search }) =>
      call(search ? `?search=${encodeURIComponent(search)}` : ""),
  );

  server.tool(
    "get_student",
    "Get one student by Student ID, for example ST101.",
    { studentId: z.string() },
    async ({ studentId }) => call(`/${encodeURIComponent(studentId)}`),
  );

  server.tool(
    "add_student",
    "Add a new student record.",
    {
      studentId: z.string().min(1).describe("Unique student ID"),
      ...studentFields,
    },
    async (args) => call("", "POST", args),
  );

  server.tool(
    "update_student",
    "Update an existing student. Send only the fields that change.",
    {
      studentId: z.string(),
      ...Object.fromEntries(
        Object.entries(studentFields).map(([key, value]) => [
          key,
          value.optional(),
        ]),
      ),
    },
    async ({ studentId, ...updates }) =>
      call(`/${encodeURIComponent(studentId)}`, "PUT", updates),
  );

  server.tool(
    "delete_student",
    "Permanently delete a student record. Confirm with the user before calling.",
    { studentId: z.string() },
    async ({ studentId }) =>
      call(`/${encodeURIComponent(studentId)}`, "DELETE"),
  );

  return server;
}

async function main() {
  if (process.env.MCP_TRANSPORT === "http") {
    const express = require("express");
    const secret = process.env.MCP_SECRET;

    if (!secret) {
      throw new Error("MCP_SECRET is required in HTTP mode");
    }

    const app = express();
    app.use(express.json());

    app.get("/", (_req, res) =>
      res.json({ status: "ok", service: "student-mcp" }),
    );

    app.post(`/${secret}/mcp`, async (req, res) => {
      const server = buildServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      res.on("close", () => {
        transport.close();
        server.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });

    app.all(`/${secret}/mcp`, (_req, res) =>
      res.status(405).json({ error: "Method not allowed" }),
    );

    app.listen(process.env.PORT || 3000, () =>
      console.log("MCP HTTP server ready"),
    );
  } else {
    await buildServer().connect(new StdioServerTransport());
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
