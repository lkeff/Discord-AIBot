import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createSession, getSession, getActiveSession, addStep, completeSession, listSessions, } from "./store.js";
const server = new McpServer({
    name: "sequential-thinking-mcp-server",
    version: "1.0.0",
});
// ── Tool: Start a new thinking session ──────────────────────────────
server.registerTool("start_thinking_session", {
    title: "Start Thinking Session",
    description: `Begin a new sequential thinking session for structured reasoning.
Creates a fresh session to track a chain of thought steps, revisions, and branches.
Returns the session ID to use with subsequent steps.`,
    inputSchema: {},
    annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
    },
}, async () => {
    const session = createSession();
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    sessionId: session.sessionId,
                    status: session.status,
                    message: "Thinking session started. Use add_thinking_step to record reasoning steps.",
                }, null, 2),
            },
        ],
    };
});
// ── Tool: Add a thinking step ───────────────────────────────────────
const AddStepSchema = z
    .object({
    sessionId: z
        .string()
        .optional()
        .describe("Session ID. If omitted, uses the active session."),
    title: z.string().min(1).describe("Brief title for this thinking step"),
    content: z
        .string()
        .min(1)
        .describe("Detailed reasoning content for this step"),
    totalSteps: z
        .number()
        .int()
        .min(1)
        .default(5)
        .describe("Estimated total steps for this reasoning chain"),
    isRevision: z
        .boolean()
        .default(false)
        .describe("Whether this step revises a previous step"),
    revisesStep: z
        .number()
        .int()
        .optional()
        .describe("Step number being revised (if isRevision is true)"),
    branchFromStep: z
        .number()
        .int()
        .optional()
        .describe("Step number to branch from for alternative reasoning"),
    branchId: z
        .string()
        .optional()
        .describe("Identifier for this reasoning branch"),
    confidence: z
        .number()
        .min(0)
        .max(1)
        .default(0.8)
        .describe("Confidence level for this step (0.0 – 1.0)"),
    tags: z
        .array(z.string())
        .default([])
        .describe("Tags to categorise this step (e.g. 'hypothesis', 'evidence', 'conclusion')"),
})
    .strict();
server.registerTool("add_thinking_step", {
    title: "Add Thinking Step",
    description: `Record a sequential reasoning step in the active thinking session.
Supports revisions (correcting earlier steps), branching (exploring alternative paths),
confidence scoring, and tagging for structured analysis.

Args:
  - sessionId (string, optional): Target session. Falls back to active session.
  - title (string): Brief label for the step.
  - content (string): Full reasoning content.
  - totalSteps (number): Estimated chain length (default 5).
  - isRevision (boolean): True if revising a prior step.
  - revisesStep (number, optional): Which step is being revised.
  - branchFromStep (number, optional): Branch point for alternative reasoning.
  - branchId (string, optional): Label for the branch.
  - confidence (number 0–1): Confidence in this step (default 0.8).
  - tags (string[]): Categorisation tags.`,
    inputSchema: AddStepSchema,
    annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
    },
}, async (params) => {
    const sessionId = params.sessionId ?? getActiveSession()?.sessionId ?? null;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "Error: No active session. Call start_thinking_session first.",
                },
            ],
        };
    }
    const step = addStep(sessionId, params);
    if (!step) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: Could not add step to session ${sessionId}. Session may not exist or is already completed.`,
                },
            ],
        };
    }
    const progress = `[${step.stepNumber}/${step.totalSteps}]`;
    const revisionNote = step.isRevision
        ? ` (revises step ${step.revisesStep})`
        : "";
    const branchNote = step.branchFromStep
        ? ` (branch "${step.branchId}" from step ${step.branchFromStep})`
        : "";
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    stepId: step.id,
                    progress,
                    title: step.title,
                    revision: revisionNote || undefined,
                    branch: branchNote || undefined,
                    confidence: step.confidence,
                    tags: step.tags.length ? step.tags : undefined,
                }, null, 2),
            },
        ],
    };
});
// ── Tool: Complete session ──────────────────────────────────────────
const CompleteSchema = z
    .object({
    sessionId: z
        .string()
        .optional()
        .describe("Session ID. If omitted, uses the active session."),
    summary: z
        .string()
        .optional()
        .describe("Final summary / conclusion of the reasoning chain"),
})
    .strict();
server.registerTool("complete_thinking_session", {
    title: "Complete Thinking Session",
    description: `Mark a thinking session as completed with an optional summary.
Once completed, no more steps can be added.`,
    inputSchema: CompleteSchema,
    annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    },
}, async (params) => {
    const sessionId = params.sessionId ?? getActiveSession()?.sessionId ?? null;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "Error: No active session to complete.",
                },
            ],
        };
    }
    const session = completeSession(sessionId, params.summary);
    if (!session) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: Session ${sessionId} not found.`,
                },
            ],
        };
    }
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    sessionId: session.sessionId,
                    status: session.status,
                    totalSteps: session.steps.length,
                    summary: session.summary,
                }, null, 2),
            },
        ],
    };
});
// ── Tool: Get session details ───────────────────────────────────────
const GetSessionSchema = z
    .object({
    sessionId: z
        .string()
        .optional()
        .describe("Session ID. If omitted, uses the active session."),
})
    .strict();
server.registerTool("get_thinking_session", {
    title: "Get Thinking Session",
    description: `Retrieve the full state of a thinking session, including all steps, branches, and revisions.`,
    inputSchema: GetSessionSchema,
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    },
}, async (params) => {
    const session = getSession(params.sessionId);
    if (!session) {
        return {
            content: [
                {
                    type: "text",
                    text: "Error: No session found. Provide a sessionId or start a new session.",
                },
            ],
        };
    }
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(session, null, 2),
            },
        ],
    };
});
// ── Tool: List all sessions ─────────────────────────────────────────
server.registerTool("list_thinking_sessions", {
    title: "List Thinking Sessions",
    description: `List all thinking sessions with their status and step counts.`,
    inputSchema: {},
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    },
}, async () => {
    const sessions = listSessions();
    const summaries = sessions.map((s) => ({
        sessionId: s.sessionId,
        status: s.status,
        steps: s.steps.length,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        summary: s.summary,
    }));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(summaries, null, 2),
            },
        ],
    };
});
// ── Boot ─────────────────────────────────────────────────────────────
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Sequential Thinking MCP server running on stdio");
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map