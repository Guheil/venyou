"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  type AdminProfile,
  type AdminEvent,
  type AdminEventRow,
  type AdminReservation,
  type AdminReservationRow,
  type AdminSummary,
  type AdminVenue,
  type AdminVenueRow,
  EVENT_SELECT,
  RESERVATION_SELECT,
  VENUE_SELECT,
  emptyAdminSummary,
  mapEventRow,
  mapReservationRow,
  mapVenueRow,
} from "@/lib/adminData";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/lib/ToastContext";

export type AdminAccessState = "loading" | "ready" | "denied";

export function useAdminData() {
  const { user, loading: authLoading } = useAuth();
  const { error: showError } = useToast();
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [accessState, setAccessState] = useState<AdminAccessState>("loading");
  const [summary, setSummary] = useState<AdminSummary>(emptyAdminSummary);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  const refreshData = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    void (async () => {
      if (!user) {
        if (!active) return;
        setAdminProfile(null);
        setAccessState("denied");
        setSummary(emptyAdminSummary);
        setReservations([]);
        setVenues([]);
        setEvents([]);
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      setAccessState((state) => (state === "ready" ? "ready" : "loading"));

      const { data: profileData, error: profileError } = await supabase.rpc(
        "current_admin_profile"
      );

      if (!active) return;

      const profile = Array.isArray(profileData)
        ? (profileData[0] as AdminProfile | undefined)
        : null;

      if (profileError || !profile) {
        setAdminProfile(null);
        setAccessState("denied");
        setSummary(emptyAdminSummary);
        setReservations([]);
        setVenues([]);
        setEvents([]);
        setLoadingData(false);
        return;
      }

      setAdminProfile(profile);
      setAccessState("ready");

      const [summaryResult, reservationResult, venueResult, eventResult] = await Promise.all([
        supabase.rpc("get_admin_dashboard_summary"),
        supabase
          .from("venue_reservations")
          .select(RESERVATION_SELECT)
          .order("created_at", { ascending: false }),
        supabase
          .from("venues")
          .select(VENUE_SELECT)
          .order("updated_at", { ascending: false }),
        supabase.rpc("get_admin_events"),
      ]);

      if (!active) return;

      if (
        summaryResult.error ||
        reservationResult.error ||
        venueResult.error ||
        eventResult.error
      ) {
        showError(
          "Could not load admin data",
          "Check that the admin migrations have been applied and your account is active."
        );
        setLoadingData(false);
        return;
      }

      const summaryRow = Array.isArray(summaryResult.data)
        ? (summaryResult.data[0] as AdminSummary | undefined)
        : null;

      setSummary(summaryRow ?? emptyAdminSummary);
      setReservations(
        ((reservationResult.data ?? []) as unknown as AdminReservationRow[]).map(
          mapReservationRow
        )
      );
      setVenues(
        ((venueResult.data ?? []) as unknown as AdminVenueRow[]).map(mapVenueRow)
      );
      setEvents(
        ((eventResult.data ?? []) as unknown as AdminEventRow[]).map(mapEventRow)
      );
      setLoadingData(false);
    })();

    return () => {
      active = false;
    };
  }, [authLoading, refreshToken, showError, user]);

  return {
    accessState,
    adminProfile,
    loadingData,
    refreshData,
    events,
    reservations,
    summary,
    venues,
  };
}
