// Natural Language Query endpoint. Translates a user query into a list of
// structured dashboard actions via Anthropic's tool_use. Runs on the Node
// runtime so the @anthropic-ai/sdk can use Node primitives.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { buildSystemPrompt } from "@/lib/nlq/system-prompt";
import { tools, validateActions } from "@/lib/nlq/tools";
import type { NlqAction, NlqRequest, NlqResponse } from "@/lib/nlq/types";

export const runtime = "nodejs";
// Don't pre-render this endpoint at build time; it depends on env + request body.
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 1024;

export async function POST(request: Request): Promise<NextResponse<NlqResponse>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  let body: NlqRequest;
  try {
    body = (await request.json()) as NlqRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { query, state } = body;
  if (typeof query !== "string" || !query.trim()) {
    return NextResponse.json({ ok: false, error: "Empty query." }, { status: 400 });
  }
  if (!state || typeof state !== "object") {
    return NextResponse.json({ ok: false, error: "Missing dashboard state." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(state),
      tools,
      messages: [{ role: "user", content: query.trim() }]
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ ok: false, error: `Anthropic request failed: ${detail}` }, { status: 502 });
  }

  // Collect all tool_use blocks; also collect any text block for the summary.
  const actions: NlqAction[] = [];
  let summary = "";
  for (const block of message.content) {
    if (block.type === "tool_use") {
      actions.push({ name: block.name, input: block.input } as NlqAction);
    } else if (block.type === "text") {
      summary += block.text;
    }
  }
  summary = summary.trim();

  if (actions.length === 0) {
    return NextResponse.json({
      ok: true,
      summary: summary || "No dashboard changes — the request did not map to any supported action.",
      actions: []
    });
  }

  const validationError = validateActions(actions, state.widgetIds);
  if (validationError) {
    return NextResponse.json(
      { ok: false, error: `Validation failed: ${validationError}` },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    summary: summary || `Applied ${actions.length} change${actions.length === 1 ? "" : "s"}.`,
    actions
  });
}
