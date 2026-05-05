"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  AdminAccessDenied,
  AdminLoadingState,
  AdminPanel,
  AdminSectionHeader,
  ReservationStatusPill,
} from "@/components/admin/AdminPrimitives";
import { formatPeso } from "@/lib/budget";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/lib/ToastContext";
import {
  formatAdminDate,
  formatAdminDateTime,
  mapReservationRow,
  RESERVATION_SELECT,
  type AdminProfile,
  type AdminReservation,
  type AdminReservationRow,
} from "@/lib/adminData";
import { Activity, ClipboardList, Search, UserRound } from "lucide-react";

interface AdminActionLogRow {
  id: string;
  created_at: string;
  admin_user_id: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
}

export default function AdminActivityPage() {
  const { user, loading: authLoading } = useAuth();
  const { error: showError } = useToast();
  const [accessState, setAccessState] = useState<"loading" | "ready" | "denied">(
    "loading"
  );
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [logs, setLogs] = useState<AdminActionLogRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "pending_payment" | "cancelled">("all");

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    void (async () => {
      if (!user) {
        if (!active) return;
        setAccessState("denied");
        return;
      }

      setLoadingData(true);
      const { data: profileData, error: profileError } = await supabase.rpc(
        "current_admin_profile"
      );
      const profile = Array.isArray(profileData)
        ? (profileData[0] as AdminProfile | undefined)
        : undefined;

      if (!active) return;
      if (profileError || !profile) {
        setAccessState("denied");
        setLoadingData(false);
        return;
      }

      setAccessState("ready");

      const [reservationResult, logResult] = await Promise.all([
        supabase
          .from("venue_reservations")
          .select(RESERVATION_SELECT)
          .order("updated_at", { ascending: false }),
        supabase
          .from("admin_action_logs")
          .select("id, created_at, admin_user_id, action, target_table, target_id, metadata")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (!active) return;
      if (reservationResult.error) {
        showError("Could not load activity", "Please refresh the page.");
        setLoadingData(false);
        return;
      }

      setReservations(
        ((reservationResult.data ?? []) as unknown as AdminReservationRow[]).map(
          mapReservationRow
        )
      );
      setLogs((logResult.data ?? []) as unknown as AdminActionLogRow[]);
      setLoadingData(false);
    })();

    return () => {
      active = false;
    };
  }, [authLoading, showError, user]);

  const timeline = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return reservations
      .map((reservation) => ({
        id: reservation.id,
        date: reservation.updatedAt,
        title:
          reservation.reservationStatus === "confirmed"
            ? `${reservation.venueName} confirmed`
            : reservation.reservationStatus === "cancelled"
              ? `${reservation.venueName} cancelled`
              : `${reservation.venueName} pending`,
        detail: `${reservation.referenceNumber} — ${formatPeso(reservation.totalAmount)} — ${formatAdminDate(reservation.eventDate)}`,
        reservation,
      }))
      .filter((item) => {
        const matchesStatus =
          statusFilter === "all" || item.reservation.reservationStatus === statusFilter;
        const matchesSearch =
          !q ||
          item.reservation.venueName.toLowerCase().includes(q) ||
          item.reservation.referenceNumber.toLowerCase().includes(q) ||
          item.reservation.contactName.toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reservations, searchQuery, statusFilter]);

  if (accessState === "loading" || authLoading) {
    return (
      <AdminShell>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
          <AdminLoadingState label="Loading activity" />
        </main>
      </AdminShell>
    );
  }

  if (accessState === "denied") {
    return (
      <AdminShell>
        <AdminAccessDenied />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 page-fade sm:px-6 sm:py-10">
        <section className="rounded-[30px] border border-[#E0DDD5] bg-gradient-to-br from-[#FCFBF8] via-white to-[#F0F6F4] p-6 sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#C8E0DA] bg-[#EAF2F0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
            <ClipboardList size={13} />
            Activity
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#1A1817] sm:text-4xl">
            Admin activity and reservation movement.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#7C7671]">
            Track payment confirmations, cancellations, and reservation state
            changes separately from the management list pages.
          </p>
        </section>

        {loadingData ? (
          <div className="mt-6">
            <AdminLoadingState label="Loading activity details" />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <AdminPanel>
              <AdminSectionHeader
                eyebrow="Reservation timeline"
                title="Latest booking movement"
                description="A full activity feed generated from reservation updates."
                action={
                  <span className="rounded-full border border-[#E0DDD5] bg-[#FCFBF8] px-3 py-1 text-xs font-semibold text-[#7C7671]">
                    {timeline.length} records
                  </span>
                }
              />

              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by venue, reference or customer…"
                    className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-[#FCFBF8] pl-9 pr-4 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]"
                  />
                </div>
                <div className="flex gap-2">
                  {(["all", "confirmed", "pending_payment", "cancelled"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatusFilter(key)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        statusFilter === key
                          ? "border-[#2A6558] bg-[#2A6558] text-white"
                          : "border-[#E0DDD5] bg-white text-[#7C7671] hover:border-[#2A6558]"
                      }`}
                    >
                      {key === "all" ? "All" : key === "pending_payment" ? "Pending" : key.charAt(0).toUpperCase() + key.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {timeline.length === 0 ? (
                <p className="text-sm text-[#7C7671]">No reservation activity yet.</p>
              ) : (
                <div className="space-y-4">
                  {timeline.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8] p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="mb-2">
                            <ReservationStatusPill
                              status={item.reservation.reservationStatus}
                              paymentStatus={item.reservation.paymentStatus}
                            />
                          </div>
                          <p className="font-extrabold text-[#1A1817]">{item.title}</p>
                          <p className="mt-1 text-sm text-[#7C7671]">{item.detail}</p>
                          <p className="mt-1 text-xs text-[#7C7671]">
                            Customer: {item.reservation.contactName} -{" "}
                            {item.reservation.contactPhone}
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-[#7C7671]">
                          {formatAdminDateTime(item.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanel>

            <AdminPanel>
              <AdminSectionHeader
                eyebrow="Audit"
                title="Admin action log"
                description="Actions written by admin RPCs, including confirmations and cancellations."
              />

              {logs.length === 0 ? (
                <p className="text-sm text-[#7C7671]">
                  No admin action logs yet. Payment actions will appear here.
                </p>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2F0] text-[#2A6558]">
                          {log.action.includes("payment") ? (
                            <Activity size={16} />
                          ) : (
                            <UserRound size={16} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-[#1A1817]">
                            {log.action.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </p>
                          <p className="mt-1 text-xs text-[#7C7671]">
                            {log.target_table.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </p>
                          <p className="mt-1 text-xs text-[#7C7671]">
                            {formatAdminDateTime(log.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanel>
          </div>
        )}
      </main>
    </AdminShell>
  );
}
