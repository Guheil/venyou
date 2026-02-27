"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { SavedEvent } from "./types";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase/client";
import {
  mapRowToSavedEvent,
  mapSavedEventPatchToRowPatch,
  mapSavedEventToInsertRow,
  type EventRow,
} from "@/lib/eventMapper";

const EVENT_SELECT_COLUMNS = [
  "id",
  "created_at",
  "event_name",
  "occasion",
  "description",
  "pax",
  "budget_min",
  "budget_max",
  "budget_type",
  "city",
  "area",
  "radius_km",
  "setting",
  "event_date",
  "start_time",
  "duration_hours",
  "amenities",
  "catering",
  "tone_keywords",
  "extra_notes",
  "status",
  "venue_count",
  "top_venue_id",
  "top_venue_name",
  "user_id",
].join(",");

export function useEvents() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [events, setEvents] = useState<SavedEvent[]>([]);
  const [eventsOwnerId, setEventsOwnerId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const requestVersionRef = useRef(0);

  const refreshEvents = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current;

    if (!userId) {
      setEvents([]);
      setEventsOwnerId(null);
      setHydrated(true);
      return;
    }

    setHydrated(false);

    const { data, error } = await supabase
      .from("events")
      .select(EVENT_SELECT_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (requestVersion !== requestVersionRef.current) {
      return;
    }

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as EventRow[];
    setEvents(rows.map(mapRowToSavedEvent));
    setEventsOwnerId(userId);
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;

    void (async () => {
      try {
        await refreshEvents();
      } catch {
        setEvents([]);
        setEventsOwnerId(userId);
        setHydrated(true);
      }
    })();
  }, [authLoading, refreshEvents, userId]);

  const addEvent = useCallback(
    async (event: SavedEvent) => {
      if (!userId) {
        throw new Error("You must be signed in to add events.");
      }

      const { data, error } = await supabase
        .from("events")
        .insert(mapSavedEventToInsertRow(event, userId))
        .select(EVENT_SELECT_COLUMNS)
        .single();

      if (error) {
        throw error;
      }

      const saved = mapRowToSavedEvent(data as unknown as EventRow);
      setEvents((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      setEventsOwnerId(userId);
      return saved;
    },
    [userId]
  );

  const updateEvent = useCallback(
    async (id: string, patch: Partial<SavedEvent>) => {
      if (!userId) {
        throw new Error("You must be signed in to update events.");
      }

      const dbPatch = mapSavedEventPatchToRowPatch(patch);
      if (Object.keys(dbPatch).length === 0) return;

      const { data, error } = await supabase
        .from("events")
        .update(dbPatch)
        .eq("id", id)
        .eq("user_id", userId)
        .select(EVENT_SELECT_COLUMNS)
        .single();

      if (error) {
        throw error;
      }

      const updated = mapRowToSavedEvent(data as unknown as EventRow);
      setEvents((prev) => prev.map((event) => (event.id === id ? updated : event)));
      setEventsOwnerId(userId);
    },
    [userId]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!userId) {
        throw new Error("You must be signed in to delete events.");
      }

      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) {
        throw error;
      }

      setEvents((prev) => prev.filter((event) => event.id !== id));
    },
    [userId]
  );

  const scopedEvents = useMemo(
    () => (eventsOwnerId === userId ? events : []),
    [events, eventsOwnerId, userId]
  );
  const scopedHydrated = userId ? hydrated && eventsOwnerId === userId : hydrated;

  const getEvent = useCallback(
    (id: string) => scopedEvents.find((event) => event.id === id),
    [scopedEvents]
  );

  return {
    events: scopedEvents,
    hydrated: scopedHydrated,
    addEvent,
    updateEvent,
    deleteEvent,
    getEvent,
    refreshEvents,
  };
}
