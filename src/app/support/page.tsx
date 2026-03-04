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
const BULLET_ITEM_PATTERN = /^\s*[-*\u2022]\s+(.+)$/;

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
          className="pt-1 text-[11px] font-semibold uppercase tracking-widest text-[#7C7671]"
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

// ─── Typewriter effect ──────────────────────────────────────
const TYPEWRITER_SPEED = 12; // ms per character

function useTypewriter(text: string, enabled: boolean) {
  const [displayed, setDisplayed] = useState(enabled ? "" : text);
  const [done, setDone] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    setDisplayed("");
    setDone(false);
    let i = 0;

    const id = setInterval(() => {
      i += 1;
      if (i >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(id);
      } else {
        setDisplayed(text.slice(0, i));
      }
    }, TYPEWRITER_SPEED);

    return () => clearInterval(id);
  }, [text, enabled]);

  return { displayed, done };
}

function TypewriterAssistant({
  content,
  animate,
  onDone,
}: {
  content: string;
  animate: boolean;
  onDone?: () => void;
}) {
  const { displayed, done } = useTypewriter(content, animate);
  const firedRef = useRef(false);

  useEffect(() => {
    if (done && !firedRef.current) {
      firedRef.current = true;
      onDone?.();
    }
  }, [done, onDone]);

  return (
    <>
      {renderAssistantContent(displayed)}
      {!done && (
        <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-[#2A6558]" />
      )}
    </>
  );
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

  // Track IDs that have already been "typed out" so we don't re-animate on re-render
  const typedIdsRef = useRef<Set<string>>(new Set());
  // Track the ID of the latest assistant message that should animate
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  const initialMsg = useMemo(
    () =>
      makeMessage(
        "assistant",
        "Hi, I am your VenYOU AI support assistant.\n\nQuick Answer:\nI can explain things in simple terms and give step-by-step actions.\n\nTry asking:\n- How do I plan my event budget?\n- Which venue should I shortlist first?\n- Where do I edit my event details?"
      ),
    []
  );

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Mark the initial message as already typed
    typedIdsRef.current.add(initialMsg.id);
    return [initialMsg];
  });

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
      const assistantMsg = makeMessage("assistant", data.reply.trim());
      setAnimatingId(assistantMsg.id);
      setMessages((current) => [...current, assistantMsg]);
    } catch (error) {
      const detail =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "Support chat is unavailable right now.";

      showError("AI support unavailable", detail);
      const errorMsg = makeMessage(
        "assistant",
        "I could not reach Groq right now. Please try again in a moment."
      );
      setAnimatingId(errorMsg.id);
      setMessages((current) => [
        ...current,
        errorMsg,
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
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 page-fade">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href={ROUTES.dashboard}
              className="mb-3 sm:mb-4 inline-flex items-center gap-2 text-sm text-[#7C7671] hover:text-[#2A6558]"
            >
              <ArrowLeft size={15} /> Back to Dashboard
            </Link>

            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={18} className="text-[#2A6558]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#2A6558]">
                AI Support
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1A1817]">
              Chat Assistant
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#7C7671]">
              Ask planning questions and get Groq-powered guidance for your event setup.
            </p>
          </div>

          <div className="w-full sm:w-auto sm:min-w-64 rounded-2xl border border-[#E0DDD5] bg-white px-4 py-3">
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

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="flex h-[60vh] sm:h-[72vh] min-h-[380px] sm:min-h-[560px] flex-col overflow-hidden rounded-2xl border border-[#E0DDD5] bg-[var(--vn-surface)] shadow-sm">
            <div
              ref={chatScrollRef}
              className="flex-1 space-y-3 sm:space-y-4 overflow-y-auto p-3 sm:p-5"
              style={{
                background:
                  "linear-gradient(to bottom, var(--vn-surface) 0%, var(--vn-bg) 100%)",
              }}
            >
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <article
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[92%] sm:max-w-[90%] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed shadow-sm ${
                        isUser
                          ? "rounded-br-md bg-[#2A6558] text-white"
                          : "rounded-bl-md border border-[#E0DDD5] bg-[var(--vn-surface)] text-[#1A1817]"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest opacity-80">
                        {isUser ? <User size={12} /> : <Bot size={12} />}
                        {isUser ? "You" : "VenYOU AI"}
                      </div>
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <TypewriterAssistant
                          content={message.content}
                          animate={message.id === animatingId && !typedIdsRef.current.has(message.id)}
                          onDone={() => {
                            typedIdsRef.current.add(message.id);
                            setAnimatingId(null);
                          }}
                        />
                      )}
                    </div>
                  </article>
                );
              })}

              {sending && (
                <article className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-[#E0DDD5] bg-[var(--vn-surface)] px-4 py-3 text-sm text-[#7C7671] shadow-sm">
                    Thinking and drafting clear steps...
                  </div>
                </article>
              )}
            </div>

            <div className="border-t border-[#E0DDD5] bg-[var(--vn-surface)] p-3 sm:p-4">
              <div className="flex items-end gap-2 sm:gap-3">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={onComposerKeyDown}
                  rows={2}
                  placeholder="Ask in plain words…"
                  className="min-h-[56px] sm:min-h-[88px] flex-1 resize-none rounded-xl border border-[#E0DDD5] bg-[var(--vn-bg-alt)] px-3 py-2 sm:px-3.5 sm:py-2.5 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleSend();
                  }}
                  disabled={sending || draft.trim().length === 0}
                  className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-[#2A6558] px-3 py-2 sm:px-4 sm:py-2.5 text-sm font-semibold text-white transition hover:bg-[#215249] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <SendHorizontal size={15} />
                  <span className="hidden sm:inline">Send</span>
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
                    const freshMsg = makeMessage(
                      "assistant",
                      "New chat started.\n\nQuick Answer:\nTell me your goal, and I will reply with clear steps and simple tips."
                    );
                    typedIdsRef.current = new Set([freshMsg.id]);
                    setAnimatingId(null);
                    setMessages([freshMsg]);
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
