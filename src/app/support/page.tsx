"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import AppShell from "@/components/AppShell";
import { useEventsContext } from "@/lib/EventsContext";
import { useToast } from "@/lib/ToastContext";
import { ROUTES } from "@/lib/routes";
import { ArrowLeft, Bot, SendHorizontal, Sparkles, Trash2, User } from "lucide-react";

const MAX_HISTORY_MESSAGES = 16;
const NUMBERED_ITEM_PATTERN = /^\s*\d+[.)]\s+(.+)$/;
const BULLET_ITEM_PATTERN = /^\s*[-*•]\s+(.+)$/;

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface ChatApiResponse {
  reply: string;
  model: string;
}

function makeMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

function isChatApiResponse(value: unknown): value is ChatApiResponse {
  if (!value || typeof value !== "object") return false;
  const maybe = value as { reply?: unknown; model?: unknown };
  return typeof maybe.reply === "string" && typeof maybe.model === "string";
}

function toCleanLine(line: string): string {
  return line
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function isHeadingLine(line: string): boolean {
  return line.endsWith(":") && line.length <= 48;
}

function renderAssistantContent(content: string): ReactNode {
  const lines = content.split(/\r?\n/).map(toCleanLine);
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (!line) {
      i += 1;
      continue;
    }

    if (isHeadingLine(line)) {
      blocks.push(
        <h4
          key={`heading-${i}`}
          className="pt-1 text-[11px] font-semibold uppercase tracking-widest text-[#4E4A46]"
        >
          {line.slice(0, -1)}
        </h4>
      );
      i += 1;
      continue;
    }

    if (NUMBERED_ITEM_PATTERN.test(line)) {
      const items: string[] = [];
      let pointer = i;
      while (pointer < lines.length) {
        const match = (lines[pointer] ?? "").match(NUMBERED_ITEM_PATTERN);
        if (!match) break;
        items.push(match[1].trim());
        pointer += 1;
      }

      blocks.push(
        <ol
          key={`numbered-${i}`}
          className="ml-5 list-decimal space-y-1 text-sm text-[#1A1817]"
        >
          {items.map((item, index) => (
            <li key={`numbered-item-${i}-${index}`}>{item}</li>
          ))}
        </ol>
      );

      i = pointer;
      continue;
    }

    if (BULLET_ITEM_PATTERN.test(line)) {
      const items: string[] = [];
      let pointer = i;
      while (pointer < lines.length) {
        const match = (lines[pointer] ?? "").match(BULLET_ITEM_PATTERN);
        if (!match) break;
        items.push(match[1].trim());
        pointer += 1;
      }

      blocks.push(
        <ul
          key={`bullets-${i}`}
          className="ml-5 list-disc space-y-1 text-sm text-[#1A1817]"
        >
          {items.map((item, index) => (
            <li key={`bullet-item-${i}-${index}`}>{item}</li>
          ))}
        </ul>
      );

      i = pointer;
      continue;
    }

    const paragraphLines = [line];
    let pointer = i + 1;

    while (pointer < lines.length) {
      const next = lines[pointer] ?? "";
      if (!next) break;
      if (isHeadingLine(next)) break;
      if (NUMBERED_ITEM_PATTERN.test(next)) break;
      if (BULLET_ITEM_PATTERN.test(next)) break;
      paragraphLines.push(next);
      pointer += 1;
    }

    blocks.push(
      <p key={`paragraph-${i}`} className="text-sm leading-relaxed text-[#1A1817]">
        {paragraphLines.join(" ")}
      </p>
    );

    i = pointer;
  }

  if (blocks.length === 0) {
    return <p className="text-sm leading-relaxed text-[#1A1817]">{content.trim()}</p>;
  }

  return <div className="space-y-2.5">{blocks}</div>;
}

function eventContextSummary(event: {
  eventName: string;
  occasion: string;
  pax: number;
  city: string;
  area: string;
  budgetMin: number;
  budgetMax: number;
  budgetType: string;
  setting: string;
  catering: string;
  toneKeywords: string;
}): string {
  const budgetLabel =
    event.budgetType === "per-head"
      ? `PHP ${event.budgetMin.toLocaleString()} - PHP ${event.budgetMax.toLocaleString()} per head`
      : `PHP ${event.budgetMin.toLocaleString()} - PHP ${event.budgetMax.toLocaleString()} total`;

  return [
    `Event "${event.eventName}"`,
    `${event.occasion} for ${event.pax} guests`,
    `Budget: ${budgetLabel}`,
    `Location: ${event.city}${event.area ? `, ${event.area}` : ""}`,
    `Setting: ${event.setting}`,
    `Catering: ${event.catering}`,
    event.toneKeywords ? `Tone: ${event.toneKeywords}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

export default function SupportPage() {
  const { events, hydrated, getEvent } = useEventsContext();
  const { error: showError } = useToast();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [resolvedModel, setResolvedModel] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    makeMessage(
      "assistant",
      "Hi, I am your VenYOU AI support assistant.\n\nQuick Answer:\nI can explain things in simple terms and give step-by-step actions.\n\nTry asking:\n- How do I plan my event budget?\n- Which venue should I shortlist first?\n- Where do I edit my event details?"
    ),
  ]);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (events.length === 0) {
      setSelectedEventId("");
      return;
    }

    if (!selectedEventId || !events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(events[0]?.id ?? "");
    }
  }, [events, hydrated, selectedEventId]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const selectedEvent = useMemo(
    () => (selectedEventId ? getEvent(selectedEventId) : undefined),
    [getEvent, selectedEventId]
  );

  const context = useMemo(
    () => (selectedEvent ? eventContextSummary(selectedEvent) : ""),
    [selectedEvent]
  );

  const handleSend = async () => {
    const nextPrompt = draft.trim();
    if (!nextPrompt || sending) return;

    const userMessage = makeMessage("user", nextPrompt);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setSending(true);

    try {
      const payload = {
        context,
        messages: nextMessages
          .slice(-MAX_HISTORY_MESSAGES)
          .map((message) => ({ role: message.role, content: message.content })),
      };

      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let detail = `Support chat request failed (${response.status}).`;
        try {
          const errorBody = (await response.json()) as { error?: unknown };
          if (typeof errorBody.error === "string" && errorBody.error.trim()) {
            detail = errorBody.error.trim();
          }
        } catch {
          // Use fallback detail.
        }
        throw new Error(detail);
      }

      const data = (await response.json()) as unknown;
      if (!isChatApiResponse(data)) {
        throw new Error("Support chat returned an invalid response.");
      }

      setResolvedModel(data.model);
      setMessages((current) => [...current, makeMessage("assistant", data.reply.trim())]);
    } catch (error) {
      const detail =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "Support chat is unavailable right now.";

      showError("AI support unavailable", detail);
      setMessages((current) => [
        ...current,
        makeMessage(
          "assistant",
          "I could not reach Groq right now. Please try again in a moment."
        ),
      ]);
    } finally {
      setSending(false);
    }
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void handleSend();
  };

  if (!hydrated) {
    return (
      <AppShell>
        <main className="flex min-h-[60vh] items-center justify-center px-6 py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-6 py-10 page-fade">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href={ROUTES.dashboard}
              className="mb-4 inline-flex items-center gap-2 text-sm text-[#7C7671] hover:text-[#2A6558]"
            >
              <ArrowLeft size={15} /> Back to Dashboard
            </Link>

            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={18} className="text-[#2A6558]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#2A6558]">
                AI Support
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1817]">
              Chat Assistant
            </h1>
            <p className="mt-1 text-sm text-[#7C7671]">
              Ask planning questions and get Groq-powered guidance for your event setup.
            </p>
          </div>

          <div className="min-w-64 rounded-2xl border border-[#E0DDD5] bg-white px-4 py-3">
            <label
              htmlFor="support-event-context"
              className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-[#7C7671]"
            >
              Event context
            </label>
            <select
              id="support-event-context"
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
              className="w-full rounded-lg border border-[#E0DDD5] bg-white px-3 py-2 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20"
            >
              <option value="">No event context</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.eventName}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-[#7C7671]">
              {resolvedModel
                ? `Model: ${resolvedModel}`
                : "Model will appear after your first message."}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="flex h-[72vh] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-[#E0DDD5] bg-white shadow-sm">
            <div
              ref={chatScrollRef}
              className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-[#FCFBF8] to-[#F8F6F1] p-5"
            >
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <article
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        isUser
                          ? "rounded-br-md bg-[#2A6558] text-white"
                          : "rounded-bl-md border border-[#DAD6CE] bg-[#FFFEFC] text-[#1A1817]"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest opacity-80">
                        {isUser ? <User size={12} /> : <Bot size={12} />}
                        {isUser ? "You" : "VenYOU AI"}
                      </div>
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        renderAssistantContent(message.content)
                      )}
                    </div>
                  </article>
                );
              })}

              {sending && (
                <article className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-[#E0DDD5] bg-white px-4 py-3 text-sm text-[#7C7671] shadow-sm">
                    Thinking and drafting clear steps...
                  </div>
                </article>
              )}
            </div>

            <div className="border-t border-[#E0DDD5] bg-white p-4">
              <div className="flex items-end gap-3">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={onComposerKeyDown}
                  rows={3}
                  placeholder="Ask in plain words. Example: 'How do I choose between 3 venues for 120 guests?'"
                  className="min-h-[88px] flex-1 resize-none rounded-xl border border-[#E0DDD5] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleSend();
                  }}
                  disabled={sending || draft.trim().length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2A6558] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#215249] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <SendHorizontal size={15} />
                  Send
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#E0DDD5] bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#1A1817]">Session Controls</h2>
                <button
                  type="button"
                  onClick={() => {
                    setMessages([
                      makeMessage(
                        "assistant",
                        "New chat started.\n\nQuick Answer:\nTell me your goal, and I will reply with clear steps and simple tips."
                      ),
                    ]);
                    setResolvedModel(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E0DDD5] px-2.5 py-1 text-xs font-medium text-[#7C7671] transition hover:border-[#2A6558] hover:text-[#2A6558]"
                >
                  <Trash2 size={12} />
                  Clear chat
                </button>
              </div>
              <p className="text-xs text-[#7C7671]">
                Messages are kept only in your current browser session.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E0DDD5] bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-[#1A1817]">Attached Context</h2>
              <p className="text-xs leading-relaxed text-[#7C7671]">
                {context || "No event context attached. Select an event above for more targeted answers."}
              </p>
            </div>

            <div className="rounded-2xl bg-[#1A1817] p-4">
              <h2 className="mb-2 text-sm font-semibold text-white">Best Prompts</h2>
              <p className="text-xs leading-relaxed text-white/75">
                Ask concrete questions like: &quot;Compare 3 indoor options under PHP 2,000 per head for 150 guests in Pasig.&quot;
              </p>
            </div>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
