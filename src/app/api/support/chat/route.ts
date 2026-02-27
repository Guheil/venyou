import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const MAX_MESSAGES = 16;
const MAX_MESSAGE_CHARS = 1200;
const MAX_CONTEXT_CHARS = 500;
const MAX_REPLY_CHARS = 2200;
const MAX_REPLY_LINES = 42;

type ChatRole = "user" | "assistant";

interface ChatInputMessage {
  role: ChatRole;
  content: string;
}

interface ChatRequestPayload {
  messages: ChatInputMessage[];
  context: string;
}

interface ChatResponsePayload {
  reply: string;
  model: string;
}

interface GroqChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface GroqErrorResponse {
  error?: {
    message?: string;
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toStringValue(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function parseModelList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parsePayload(body: unknown): ChatRequestPayload | null {
  if (!body || typeof body !== "object") return null;

  const maybe = body as {
    messages?: unknown;
    context?: unknown;
  };

  if (!Array.isArray(maybe.messages)) return null;

  const messages = maybe.messages
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const message = entry as Record<string, unknown>;
      const role =
        message.role === "user" || message.role === "assistant"
          ? message.role
          : null;
      const content = toStringValue(message.content, MAX_MESSAGE_CHARS);
      if (!role || !content) return null;
      return { role, content } as ChatInputMessage;
    })
    .filter((entry): entry is ChatInputMessage => entry !== null)
    .slice(-MAX_MESSAGES);

  if (messages.length === 0) return null;
  if (!messages.some((message) => message.role === "user")) return null;
  if (messages[messages.length - 1]?.role !== "user") return null;

  return {
    messages,
    context: toStringValue(maybe.context, MAX_CONTEXT_CHARS),
  };
}

function buildSystemPrompt(context: string): string {
  const rules = [
    "You are VenYOU AI Support for an event planning platform.",
    "Help users with event planning, venue selection, budgeting, logistics, and app usage.",
    "Use simple layman's terms. Avoid technical jargon unless the user asks for it.",
    "Be practical, specific, and concise.",
    "Format responses for readability using this plain-text structure when relevant:",
    "Quick Answer:",
    "1-2 short sentences",
    "",
    "Steps:",
    "1. ...",
    "2. ...",
    "",
    "Tips:",
    "- ...",
    "- ...",
    "Use numbered steps for actions and dash bullets for options/tips.",
    "Do not use markdown markers such as **, #, or backticks.",
    "When information is missing, ask a short clarifying question.",
    "Do not claim actions were done if you did not do them.",
    "Do not provide unsafe, illegal, or policy-violating instructions.",
  ];

  if (context) {
    rules.push(`Current user context: ${context}`);
  }

  return rules.join("\n");
}

function normalizeReplyForDisplay(rawReply: string): string {
  const strippedMarkdown = rawReply
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1");

  const lines = strippedMarkdown
    .slice(0, MAX_REPLY_CHARS * 2)
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim());

  const out: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (out.length > 0 && out[out.length - 1] !== "") {
        out.push("");
      }
      continue;
    }
    out.push(line);
    if (out.length >= MAX_REPLY_LINES) break;
  }

  while (out.length > 0 && out[out.length - 1] === "") {
    out.pop();
  }

  const joined = out.join("\n").trim();
  return joined.slice(0, MAX_REPLY_CHARS);
}

async function readGroqError(response: Response): Promise<string> {
  let text = "";

  try {
    text = (await response.text()).trim();
  } catch {
    // Ignore and fall back to status text.
  }

  if (!text) {
    return `${response.status} ${response.statusText}`;
  }

  try {
    const parsed = JSON.parse(text) as GroqErrorResponse;
    const message = parsed.error?.message?.trim();
    if (message) return message.slice(0, 320);
  } catch {
    // Not JSON; fall back to raw text below.
  }

  return text.slice(0, 320);
}

async function requestGroq(
  groqApiKey: string,
  model: string,
  payload: ChatRequestPayload
): Promise<
  | { ok: true; json: GroqChatCompletionResponse; model: string }
  | { ok: false; status: number; message: string; model: string }
> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(payload.context),
        },
        ...payload.messages,
      ],
    }),
  });

  if (!response.ok) {
    const message = await readGroqError(response);
    return { ok: false, status: response.status, message, model };
  }

  const json = (await response.json()) as GroqChatCompletionResponse;
  return { ok: true, json, model };
}

export async function POST(request: NextRequest) {
  const groqApiKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const fallbackModels = parseModelList(process.env.GROQ_FALLBACK_MODELS);
  const modelsToTry = [...new Set([groqModel, ...fallbackModels])];

  if (!groqApiKey) {
    return NextResponse.json(
      { error: "Groq is not configured. Set GROQ_API_KEY." },
      { status: 503 }
    );
  }

  let payload: ChatRequestPayload | null = null;

  try {
    const rawBody = (await request.json()) as unknown;
    payload = parsePayload(rawBody);
  } catch {
    payload = null;
  }

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const failures: Array<{ model: string; status: number; message: string }> = [];
  let completion: GroqChatCompletionResponse | null = null;
  let resolvedModel = modelsToTry[0] ?? groqModel;

  for (const model of modelsToTry) {
    const attempt = await requestGroq(groqApiKey, model, payload);
    if (attempt.ok) {
      completion = attempt.json;
      resolvedModel = model;
      break;
    }

    failures.push({
      model,
      status: attempt.status,
      message: attempt.message,
    });

    if (attempt.status === 429) {
      return NextResponse.json(
        { error: `Groq quota exceeded. ${attempt.message}` },
        { status: 429 }
      );
    }
  }

  if (!completion) {
    const firstFailure = failures[0];
    const detail = firstFailure
      ? `Model ${firstFailure.model} failed: ${firstFailure.message}`
      : "No Groq response received.";
    console.error("[Groq Chat] Request failed", failures);
    return NextResponse.json(
      { error: `Groq request failed. ${detail}` },
      { status: 502 }
    );
  }

  const reply = completion.choices?.[0]?.message?.content?.trim() ?? "";
  const normalizedReply = normalizeReplyForDisplay(reply);

  if (!normalizedReply) {
    return NextResponse.json(
      { error: "Groq returned an empty response." },
      { status: 502 }
    );
  }

  return NextResponse.json<ChatResponsePayload>({
    reply: normalizedReply,
    model: resolvedModel,
  });
}
