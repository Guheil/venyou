"use client";

import { createContext, useContext } from "react";
import { useEvents } from "@/lib/useEvents";
import type { SavedEvent } from "@/lib/types";

interface EventsContextValue {
  events: SavedEvent[];
  hydrated: boolean;
  addEvent: (e: SavedEvent) => Promise<void>;
  updateEvent: (id: string, patch: Partial<SavedEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEvent: (id: string) => SavedEvent | undefined;
  refreshEvents: () => Promise<void>;
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const value = useEvents();
  return (
    <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
  );
}

export function useEventsContext() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEventsContext must be used within EventsProvider");
  return ctx;
}
