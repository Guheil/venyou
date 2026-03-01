import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const MAX_VENUES_PER_REQUEST = 5;

interface EventInsightInput {
  id: string;
  eventName: string;
  occasion: string;
  description: string;
  pax: number;
  budgetMin: number;
  budgetMax: number;
  budgetType: "per-head" | "total";
  city: string;
  area: string;
  setting: "indoor" | "outdoor" | "both";
  catering: "included" | "external" | "none";
  toneKeywords: string;
  amenities: string[];
}

interface VenueInsightInput {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  area: string;
  capacity: number;
  pricePerHead: number;
  distanceKm: number;
  match: number;
  tags: string[];
}

interface InsightsRequestPayload {
  event: EventInsightInput;
  venues: VenueInsightInput[];
}

interface InsightsResponsePayload {
  summary: string;
  insights: Array<{ id: string; insight: string }>;
}

interface GroqChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
    finish_reason?: string;
  }>;
}

interface GroqErrorResponse {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toStringValue(value: unknown, maxLength = 240): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return value;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 12);
}

function parsePayload(body: unknown): InsightsRequestPayload | null {
  if (!body || typeof body !== "object") return null;

  const maybe = body as {
    event?: Record<string, unknown>;
    venues?: unknown;
  };

  if (!maybe.event || !Array.isArray(maybe.venues)) return null;

  const event = maybe.event;
  const parsedEvent: EventInsightInput = {
    id: toStringValue(event.id, 80),
    eventName: toStringValue(event.eventName, 120),
    occasion: toStringValue(event.occasion, 120),
    description: toStringValue(event.description, 500),
    pax: Math.max(0, Math.round(toNumberValue(event.pax, 0))),
    budgetMin: Math.max(0, Math.round(toNumberValue(event.budgetMin, 0))),
    budgetMax: Math.max(0, Math.round(toNumberValue(event.budgetMax, 0))),
    budgetType:
      event.budgetType === "total" || event.budgetType === "per-head"
        ? event.budgetType
        : "total",
    city: toStringValue(event.city, 120),
    area: toStringValue(event.area, 120),
    setting:
      event.setting === "indoor" ||
      event.setting === "outdoor" ||
      event.setting === "both"
        ? event.setting
        : "both",
    catering:
      event.catering === "included" ||
      event.catering === "external" ||
      event.catering === "none"
        ? event.catering
        : "none",
    toneKeywords: toStringValue(event.toneKeywords, 200),
    amenities: toStringArray(event.amenities),
  };

  if (!parsedEvent.id || !parsedEvent.eventName) return null;

  const venues = maybe.venues
    .slice(0, MAX_VENUES_PER_REQUEST)
    .map((value) => {
      if (!value || typeof value !== "object") return null;
      const venue = value as Record<string, unknown>;
      const parsedVenue: VenueInsightInput = {
        id: toStringValue(venue.id, 80),
        name: toStringValue(venue.name, 140),
        type: toStringValue(venue.type, 120),
        address: toStringValue(venue.address, 180),
        city: toStringValue(venue.city, 120),
        area: toStringValue(venue.area, 120),
        capacity: Math.max(0, Math.round(toNumberValue(venue.capacity, 0))),
        pricePerHead: Math.max(
          0,
          Math.round(toNumberValue(venue.pricePerHead, 0))
        ),
        distanceKm: Math.max(
          0,
          Number(toNumberValue(venue.distanceKm, 0).toFixed(2))
        ),
        match: Math.max(
          0,
          Math.min(100, Math.round(toNumberValue(venue.match, 0)))
        ),
        tags: toStringArray(venue.tags),
      };
      return parsedVenue.id ? parsedVenue : null;
    })
    .filter((venue): venue is VenueInsightInput => venue !== null);

  if (venues.length === 0) return null;

  return {
    event: parsedEvent,
    venues,
  };
}

function extractJsonCandidates(rawText: string): string[] {
  const out = new Set<string>();
  const source = rawText.trim();
  if (!source) return [];

  out.add(source);

  const markdownJson = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (markdownJson?.[1]) {
    out.add(markdownJson[1].trim());
  }

  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    out.add(source.slice(firstBrace, lastBrace + 1).trim());
  }

  return [...out].filter((entry) => entry.length > 0);
}

function normalizeInsights(value: unknown): Array<{ id: string; insight: string }> {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const obj = entry as Record<string, unknown>;
        const id = toStringValue(obj.id, 80);
        const insight = toStringValue(obj.insight, 360);
        return id && insight ? { id, insight } : null;
      })
      .filter((entry): entry is { id: string; insight: string } => entry !== null);
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([id, insight]) => {
        const normalizedId = toStringValue(id, 80);
        const normalizedInsight = toStringValue(insight, 360);
        return normalizedId && normalizedInsight
          ? { id: normalizedId, insight: normalizedInsight }
          : null;
      })
      .filter((entry): entry is { id: string; insight: string } => entry !== null);
  }

  return [];
}

function tryParseJson(text: string): InsightsResponsePayload | null {
  const candidates = extractJsonCandidates(text);
  if (candidates.length === 0) return null;

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as {
        summary?: unknown;
        insights?: unknown;
      };

      const summary =
        typeof parsed.summary === "string"
          ? parsed.summary.trim().slice(0, 320)
          : "";

      const insights = normalizeInsights(parsed.insights);
      if (insights.length === 0) continue;

      return {
        summary:
          summary ||
          "AI matched venues using budget, guest count, location, and event style factors.",
        insights,
      };
    } catch {
      // Keep trying alternate formats.
    }
  }

  return null;
}

function buildPrompt(payload: InsightsRequestPayload): string {
  const ev = payload.event;
  const budget =
    ev.budgetType === "per-head"
      ? `\u20b1${ev.budgetMin}\u2013\u20b1${ev.budgetMax}/head`
      : `\u20b1${ev.budgetMin}\u2013\u20b1${ev.budgetMax} total`;

  const compactEvent = {
    name: ev.eventName,
    occasion: ev.occasion,
    pax: ev.pax,
    budget,
    city: ev.city,
    setting: ev.setting,
    catering: ev.catering,
    tone: ev.toneKeywords || undefined,
  };

  const compactVenues = payload.venues.map((v) => ({
    id: v.id,
    name: v.name,
    type: v.type,
    city: v.city,
    cap: v.capacity,
    php: v.pricePerHead,
    match: v.match,
    tags: v.tags.slice(0, 3),
  }));

  return [
    `Event: ${JSON.stringify(compactEvent)}`,
    `Venues: ${JSON.stringify(compactVenues)}`,
    `Return JSON {"summary":"<25 words>","insights":[{"id":"...","insight":"<20-28 words, mention 2 fit factors: budget/capacity/location/style>"}]}. One entry per venue id. No extra keys.`,
  ].join("\n");
}

function parseModelList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

async function readGroqError(response: Response): Promise<string> {
  let text = "";

  try {
    text = (await response.text()).trim();
  } catch {
    // Ignore and fall back to status text below.
  }

  if (text) {
    try {
      const json = JSON.parse(text) as GroqErrorResponse;
      const message = json.error?.message?.trim();
      if (message) return message.slice(0, 300);
    } catch {
      // Not JSON, return raw text instead.
    }

    return text.slice(0, 300);
  }

  return `${response.status} ${response.statusText}`;
}

async function requestGroq(
  groqApiKey: string,
  model: string,
  prompt: string,
  useJsonMode: boolean
): Promise<
  | { ok: true; json: GroqChatCompletionResponse; model: string }
  | { ok: false; status: number; message: string; model: string; retryAfterMs: number }
> {
  const body: Record<string, unknown> = {
    model,
    temperature: 0.45,
    max_tokens: 280,
    messages: [
      {
        role: "system",
        content:
          "Return valid JSON with keys: summary (string), insights (array of {id,insight}).",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  };

  if (useJsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await readGroqError(response);
    const retryAfterSec = parseFloat(response.headers.get("retry-after") ?? "0") || 0;
    return { ok: false, status: response.status, message, model, retryAfterMs: Math.ceil(retryAfterSec * 1000) };
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

  let payload: InsightsRequestPayload | null = null;

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

  const prompt = buildPrompt(payload);
  const failures: Array<{ model: string; status: number; message: string }> = [];
  let completion: GroqChatCompletionResponse | null = null;

  for (const model of modelsToTry) {
    const primaryAttempt = await requestGroq(groqApiKey, model, prompt, true);
    if (primaryAttempt.ok) {
      completion = primaryAttempt.json;
      break;
    }

    failures.push({
      model,
      status: primaryAttempt.status,
      message: primaryAttempt.message,
    });

    if (primaryAttempt.status === 429) {
      // Groq returns a Retry-After header — honour it with a small buffer,
      // then make one automatic retry before giving up.
      const waitMs = Math.min((primaryAttempt.retryAfterMs || 8000) + 600, 13000);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      const retryAttempt = await requestGroq(groqApiKey, model, prompt, true);
      if (retryAttempt.ok) {
        completion = retryAttempt.json;
        break;
      }
      failures.push({ model, status: retryAttempt.status, message: retryAttempt.message });
      return NextResponse.json(
        { error: `Groq quota exceeded after retry. ${retryAttempt.message}` },
        { status: 429 }
      );
    }

    // Some models may reject JSON mode — retry once without response_format.
    const plainAttempt = await requestGroq(groqApiKey, model, prompt, false);
    if (plainAttempt.ok) {
      completion = plainAttempt.json;
      break;
    }

    failures.push({
      model,
      status: plainAttempt.status,
      message: plainAttempt.message,
    });

    if (plainAttempt.status === 429) {
      const waitMs = Math.min((plainAttempt.retryAfterMs || 8000) + 600, 13000);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      const retryPlain = await requestGroq(groqApiKey, model, prompt, false);
      if (retryPlain.ok) {
        completion = retryPlain.json;
        break;
      }
      failures.push({ model, status: retryPlain.status, message: retryPlain.message });
      return NextResponse.json(
        { error: `Groq quota exceeded after retry. ${retryPlain.message}` },
        { status: 429 }
      );
    }
  }

  if (!completion) {
    const firstFailure = failures[0];
    const detail = firstFailure
      ? `Model ${firstFailure.model} failed: ${firstFailure.message}`
      : "No Groq response received.";
    console.error("[Groq] Request failed", failures);
    return NextResponse.json(
      { error: `Groq request failed. ${detail}` },
      { status: 502 }
    );
  }

  const rawText = completion.choices?.[0]?.message?.content?.trim() ?? "";
  const parsed = tryParseJson(rawText);

  if (!parsed) {
    const parseDetail = rawText
      ? `Unparseable model output: ${rawText.slice(0, 180)}`
      : "Groq returned an empty response.";
    console.error("[Groq] Parse failure", { rawText });
    return NextResponse.json(
      { error: `Groq response could not be parsed. ${parseDetail}` },
      { status: 502 }
    );
  }

  const insightById = new Map(parsed.insights.map((entry) => [entry.id, entry.insight]));
  const orderedInsights = payload.venues
    .map((venue) => {
      const insight = insightById.get(venue.id);
      if (!insight) return null;
      return { id: venue.id, insight };
    })
    .filter((entry): entry is { id: string; insight: string } => entry !== null);

  if (orderedInsights.length === 0) {
    return NextResponse.json(
      { error: "Groq returned no usable insights." },
      { status: 502 }
    );
  }

  return NextResponse.json<InsightsResponsePayload>({
    summary: parsed.summary,
    insights: orderedInsights,
  });
}
