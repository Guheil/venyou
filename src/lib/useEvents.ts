"use client";

import { useState, useEffect, useCallback } from "react";
import type { SavedEvent } from "./types";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase/client";
import {
  mapRowToSavedEvent,
  mapSavedEventPatchToRowPatch,
  mapSavedEventToInsertRow,
  type EventRow,
} from "@/lib/eventMapper";

export function useEvents() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<SavedEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refreshEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setHydrated(true);
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    setEvents((data as EventRow[]).map(mapRowToSavedEvent));
    setHydrated(true);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    void (async () => {
      try {
        await refreshEvents();
      } catch {
        setEvents([]);
        setHydrated(true);
      }
    })();
  }, [authLoading, refreshEvents]);

  const addEvent = useCallback(
    async (event: SavedEvent) => {
      if (!user) {
        throw new Error("You must be signed in to add events.");
      }

      const { data, error } = await supabase
        .from("events")
        .insert(mapSavedEventToInsertRow(event, user.id))
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const saved = mapRowToSavedEvent(data as EventRow);
      setEvents((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
    },
    [user]
  );

  const updateEvent = useCallback(
    async (id: string, patch: Partial<SavedEvent>) => {
      if (!user) {
        throw new Error("You must be signed in to update events.");
      }

      const dbPatch = mapSavedEventPatchToRowPatch(patch);
      if (Object.keys(dbPatch).length === 0) return;

      const { data, error } = await supabase
        .from("events")
        .update(dbPatch)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const updated = mapRowToSavedEvent(data as EventRow);
      setEvents((prev) => prev.map((event) => (event.id === id ? updated : event)));
    },
    [user]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!user) {
        throw new Error("You must be signed in to delete events.");
      }

      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) {
        throw error;
      }

      setEvents((prev) => prev.filter((event) => event.id !== id));
    },
    [user]
  );

  const getEvent = useCallback(
    (id: string) => events.find((event) => event.id === id),
    [events]
  );

  return {
    events,
    hydrated,
    addEvent,
    updateEvent,
    deleteEvent,
    getEvent,
    refreshEvents,
  };
}
