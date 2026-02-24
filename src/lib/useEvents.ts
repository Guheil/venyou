"use client";

import { useState, useEffect, useCallback } from "react";
import type { SavedEvent } from "./types";

const STORAGE_KEY = "venyou_events";

function loadEvents(): SavedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedEvent[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(events: SavedEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // storage full — silent fail
  }
}

export function useEvents() {
  const [events, setEvents] = useState<SavedEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage once mounted (avoids SSR mismatch)
  useEffect(() => {
    setEvents(loadEvents());
    setHydrated(true);
  }, []);

  const addEvent = useCallback((event: SavedEvent) => {
    setEvents((prev) => {
      const updated = [event, ...prev];
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const updateEvent = useCallback(
    (id: string, patch: Partial<SavedEvent>) => {
      setEvents((prev) => {
        const updated = prev.map((e) =>
          e.id === id ? { ...e, ...patch } : e
        );
        saveToStorage(updated);
        return updated;
      });
    },
    []
  );

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const getEvent = useCallback(
    (id: string) => events.find((e) => e.id === id),
    [events]
  );

  return { events, hydrated, addEvent, updateEvent, deleteEvent, getEvent };
}
