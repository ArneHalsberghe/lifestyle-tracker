// Minimal Anthropic Messages API client (no SDK dependency), with tool use.

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export const CHAT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
export const FAST_MODEL =
  process.env.ANTHROPIC_MODEL_FAST || "claude-haiku-4-5-20251001";

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ClaudeResponse {
  content: ContentBlock[];
  stop_reason: string | null;
}

export async function callClaudeRaw(opts: {
  system: string;
  messages: ChatMessage[];
  tools?: ToolDef[];
  model?: string;
  maxTokens?: number;
}): Promise<ClaudeResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ontbreekt.");

  const body: Record<string, unknown> = {
    model: opts.model || CHAT_MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    messages: opts.messages,
  };
  if (opts.tools && opts.tools.length) body.tools = opts.tools;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    content?: ContentBlock[];
    stop_reason?: string;
  };
  return { content: data.content ?? [], stop_reason: data.stop_reason ?? null };
}

export function textOf(content: ContentBlock[]): string {
  return content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Simple text-only call (used for the reflect step). */
export async function callClaude(opts: {
  system: string;
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await callClaudeRaw(opts);
  return textOf(res.content);
}

/** Extracts the first JSON object from a model reply (handles ```json fences). */
export function parseJsonReply<T>(raw: string): T | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
