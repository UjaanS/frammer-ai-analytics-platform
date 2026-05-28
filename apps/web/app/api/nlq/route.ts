// Natural Language Query endpoint. Translates a user query into a list of
// structured dashboard actions via Groq's hosted Llama with function calling.
// Runs on the Node runtime so the groq-sdk can use Node primitives.

import Groq from "groq-sdk";
import { NextResponse } from "next/server";

import { buildSystemPrompt } from "@/lib/nlq/system-prompt";
import { tools, validateActions } from "@/lib/nlq/tools";
import type { NlqAction, NlqRequest, NlqResponse } from "@/lib/nlq/types";

export const runtime = "nodejs";
// Don't pre-render this endpoint at build time; it depends on env + request body.
export const dynamic = "force-dynamic";

// llama-3.3-70b-versatile is on Groq's free tier and supports tool calling.
// If you need higher throughput or different latency, swap for
// "llama-3.1-70b-versatile" or "llama-3.1-8b-instant".
const MODEL = "llama-3.3-70b-versatile";
const MAX_TOKENS = 1024;

export async function POST(request: Request): Promise<NextResponse<NlqResponse>> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "GROQ_API_KEY is not configured on the server." },
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

  const client = new Groq({ apiKey });

  // Llama 3.3 70B is good at tool calling but occasionally returns a
  // non-standard `<function=name{...}` template instead of proper
  // tool_calls JSON. Groq's server rejects these with `tool_use_failed`.
  // One transparent retry resolves it ~90% of the time.
  async function callGroq(): Promise<Groq.Chat.ChatCompletion> {
    return client.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      messages: [
        { role: "system", content: buildSystemPrompt(state) },
        { role: "user", content: query.trim() }
      ],
      tools,
      tool_choice: "auto"
    });
  }

  let completion: Groq.Chat.ChatCompletion;
  try {
    completion = await callGroq();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("tool_use_failed")) {
      try {
        completion = await callGroq();
      } catch (retryError) {
        const retryDetail = retryError instanceof Error ? retryError.message : "unknown error";
        return NextResponse.json({ ok: false, error: `Groq request failed (retry): ${retryDetail}` }, { status: 502 });
      }
    } else {
      return NextResponse.json({ ok: false, error: `Groq request failed: ${message}` }, { status: 502 });
    }
  }

  const message = completion.choices[0]?.message;
  if (!message) {
    return NextResponse.json({ ok: false, error: "Empty completion from model." }, { status: 502 });
  }

  // Parse tool calls (OpenAI-style: tool_calls array with function.name +
  // function.arguments as a JSON-encoded string).
  const actions: NlqAction[] = [];
  for (const call of message.tool_calls ?? []) {
    if (call.type !== "function") continue;
    let parsedInput: unknown;
    try {
      parsedInput = JSON.parse(call.function.arguments || "{}");
    } catch {
      return NextResponse.json(
        { ok: false, error: `Model returned malformed arguments for ${call.function.name}.` },
        { status: 502 }
      );
    }
    actions.push({ name: call.function.name, input: parsedInput } as NlqAction);
  }

  const summary = (message.content ?? "").trim();

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
