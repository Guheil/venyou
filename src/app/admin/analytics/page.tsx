"use client";

import { useMemo } from "react";
import AdminShell from "@/components/AdminShell";
import {
  AdminDeniedState,
  AdminLoadingState,
  AdminMetricCard,
} from "@/components/admin/AdminUI";
import { formatPeso } from "@/lib/budget";
import { formatAdminCompactNumber } from "@/lib/adminData";
import { useAdminData } from "@/lib/useAdminData";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  BarChart3,
  Building2,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────
const C = {
  teal: "#2A6558",
  amber: "#F59E0B",
  red: "#B42318",
  lightTeal: "#7BC4B8",
  blue: "#3B82F6",
  orange: "#F97316",
  purple: "#8B5CF6",
  grid: "#F0EDE8",
};
const PIE_PALETTE = [C.teal, C.blue, C.orange, C.purple, C.amber, C.red];
const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #E0DDD5",
  borderRadius: "14px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  padding: "8px 14px",
  fontSize: "12px",
  fontWeight: 600,
  color: "#1A1817",
};

function ChartPanel({
  eyebrow, title, description, children, className = "",
}: {
  eyebrow: string; title: string; description?: string;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-[28px] border border-[#E0DDD5] bg-white p-5 sm:p-6 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">{eyebrow}</p>
      <h3 className="mt-1 text-base font-extrabold text-[#1A1817]">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-[#7C7671]">{description}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function EmptyChart({ message = "No data yet." }: { message?: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-[20px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8]">
      <p className="text-sm text-[#7C7671]">{message}</p>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { accessState, loadingData, refreshData, reservations, venues, events, summary } =
    useAdminData();

  const totalOutcomes =
    summary.pending_requests + summary.confirmed_reservations + summary.cancelled_reservations;
  const confirmationRate =
    totalOutcomes > 0
      ? Math.round((summary.confirmed_reservations / totalOutcomes) * 100)
      : 0;
  const activeReservations = useMemo(
    () => reservations.filter((r) => r.reservationStatus !== "cancelled"),
    [reservations]
  );
  const averageReservationValue =
    activeReservations.length > 0
      ? Math.round(summary.total_reserved_value / activeReservations.length)
      : 0;
  const totalGuests = useMemo(() => events.reduce((s, e) => s + e.pax, 0), [events]);
  const averageCapacity =
    venues.length > 0
      ? Math.round(venues.reduce((s, v) => s + v.capacity, 0) / venues.length)
      : 0;

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        bookings: 0,
        revenue: 0,
        guests: 0,
      };
    });
    const map = Object.fromEntries(months.map((m) => [m.key, m]));
    for (const r of reservations) {
      const key = r.createdAt.slice(0, 7);
      if (!map[key]) continue;
      map[key].bookings += 1;
      map[key].guests += r.guestCount;
      if (r.reservationStatus !== "cancelled") map[key].revenue += r.totalAmount;
    }
    return months;
  }, [reservations]);

  const venuePopularity = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of activeReservations) map[r.venueName] = (map[r.venueName] ?? 0) + 1;
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, bookings]) => ({
        name: name.length > 24 ? name.slice(0, 24) + "..." : name,
        bookings,
      }));
  }, [activeReservations]);

  const paymentMethodData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of reservations) {
      const label = r.paymentMethod === "gcash" ? "GCash" : "Cash";
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);
  }, [reservations]);

  const statusData = useMemo(
    () =>
      [
        { name: "Pending", value: summary.pending_requests, color: C.amber },
        { name: "Confirmed", value: summary.confirmed_reservations, color: C.teal },
        { name: "Cancelled", value: summary.cancelled_reservations, color: C.red },
      ].filter((d) => d.value > 0),
    [summary]
  );

  const occasionData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) counts[e.occasion] = (counts[e.occasion] ?? 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({ name, value, color: PIE_PALETTE[i % PIE_PALETTE.length] }));
  }, [events]);

  if (accessState === "loading") {
    return (
      <AdminShell>
        <AdminLoadingState label="Loading analytics" />
      </AdminShell>
    );
  }
  if (accessState === "denied") {
    return (
      <AdminShell>
        <AdminDeniedState />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 page-fade sm:px-6 sm:py-10">
        <section className="rounded-[30px] border border-[#E0DDD5] bg-gradient-to-br from-[#FCFBF8] via-white to-[#F0F6F4] p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#C8E0DA] bg-[#EAF2F0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
                <BarChart3 size={13} />
                Analytics
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#1A1817] sm:text-4xl">
                Operations analytics across bookings, revenue, venues, and events.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B6661] sm:text-base">
                Track confirmation rates, revenue trends, venue demand, payment distribution,
                guest volume, and occasion mix.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshData}
              disabled={loadingData}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8D3C9] bg-white px-5 py-3 text-sm font-semibold text-[#1A1817] transition hover:border-[#2A6558] hover:text-[#2A6558] disabled:opacity-60"
            >
              <RefreshCw size={15} className={loadingData ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard icon={<TrendingUp size={18} />} label="Confirmation Rate" value={`${confirmationRate}%`} detail="Confirmed against all tracked outcomes" tone="accent" />
          <AdminMetricCard icon={<Banknote size={18} />} label="Active Value" value={formatPeso(summary.total_reserved_value)} detail={`${formatPeso(averageReservationValue)} avg per booking`} tone="dark" />
          <AdminMetricCard icon={<Users size={18} />} label="Event Guests" value={formatAdminCompactNumber(totalGuests)} detail={`${events.length} event briefs total`} />
          <AdminMetricCard icon={<Building2 size={18} />} label="Avg. Venue Capacity" value={averageCapacity.toLocaleString()} detail="Average capacity across all venues" />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
          <ChartPanel eyebrow="Bookings" title="Bookings over time" description="Number of reservations created in the last 6 months.">
            {monthlyData.every((m) => m.bookings === 0) ? (
              <EmptyChart message="No bookings in the last 6 months." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7C7671" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#7C7671" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => [`${val as number} booking${val === 1 ? "" : "s"}`, "Bookings"]} />
                  <Line type="monotone" dataKey="bookings" stroke={C.teal} strokeWidth={2.5} dot={{ fill: C.teal, strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>

          <ChartPanel eyebrow="Pipeline" title="Reservation status" description="Pending, confirmed, and cancelled split.">
            {statusData.length === 0 ? (
              <EmptyChart message="No reservations yet." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="46%" innerRadius={58} outerRadius={86} paddingAngle={3} dataKey="value">
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val, name) => [`${val as number}`, name as string]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", paddingTop: "6px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
          <ChartPanel eyebrow="Revenue" title="Revenue trends" description="Total confirmed booking value created per month.">
            {monthlyData.every((m) => m.revenue === 0) ? (
              <EmptyChart message="No confirmed revenue in the last 6 months." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.teal} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={C.teal} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7C7671" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#7C7671" }} axisLine={false} tickLine={false} width={52}
                    tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => [formatPeso(val as number), "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke={C.teal} strokeWidth={2.5} fill="url(#revenueGradient)" dot={{ fill: C.teal, strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>

          <ChartPanel eyebrow="Payments" title="Payment method" description="GCash vs cash payment split.">
            {paymentMethodData.length === 0 ? (
              <EmptyChart message="No payment data yet." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentMethodData} cx="50%" cy="46%" innerRadius={58} outerRadius={86} paddingAngle={3} dataKey="value">
                    {paymentMethodData.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val, name) => [`${val as number} reservation${val === 1 ? "" : "s"}`, name as string]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", paddingTop: "6px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <ChartPanel eyebrow="Demand" title="Venue popularity" description="Active booking count per venue (top 7).">
            {venuePopularity.length === 0 ? (
              <EmptyChart message="No active bookings yet." />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, venuePopularity.length * 44)}>
                <BarChart data={venuePopularity} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#7C7671" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#1A1817", fontWeight: 600 }} axisLine={false} tickLine={false} width={134} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => [`${val as number} booking${val === 1 ? "" : "s"}`, "Bookings"]} />
                  <Bar dataKey="bookings" fill={C.teal} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>

          <ChartPanel eyebrow="Guests" title="Guest volume" description="Total expected guests across reservations per month.">
            {monthlyData.every((m) => m.guests === 0) ? (
              <EmptyChart message="No guest data in the last 6 months." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7C7671" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#7C7671" }} axisLine={false} tickLine={false} width={38}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => [formatAdminCompactNumber(val as number), "Guests"]} />
                  <Bar dataKey="guests" fill={C.lightTeal} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>
        </div>

        {occasionData.length > 0 && (
          <div className="mt-6">
            <ChartPanel eyebrow="Events" title="Occasion mix" description="Distribution of event types across all saved event briefs.">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={occasionData} margin={{ top: 4, right: 16, bottom: 48, left: 0 }} barCategoryGap="32%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#1A1817", fontWeight: 600 }} axisLine={false} tickLine={false} interval={0} angle={-28} textAnchor="end" dy={8} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#7C7671" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => [`${val as number} event${val === 1 ? "" : "s"}`, "Events"]} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {occasionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        )}
      </main>
    </AdminShell>
  );
}
