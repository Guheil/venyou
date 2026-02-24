"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useEventsContext } from "@/lib/EventsContext";
import {
  LayoutDashboard,
  CalendarDays,
  Plus,
  MapPin,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  Clock,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Events", href: "/events", icon: CalendarDays },
  { label: "Create Event", href: "/create-event", icon: Plus },
  { label: "Recommendations", href: "/recommendations", icon: MapPin },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { events } = useEventsContext();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const recentEvents = events.slice(0, 3);

  const NavLink = ({
    href,
    icon: Icon,
    label,
  }: {
    href: string;
    icon: React.ElementType;
    label: string;
  }) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          active
            ? "bg-[#2A6558] text-white shadow-sm"
            : "text-[#7C7671] hover:bg-[#EAF2F0] hover:text-[#1A1817]"
        } ${collapsed ? "justify-center" : ""}`}
        title={collapsed ? label : undefined}
      >
        <Icon size={18} className="shrink-0" />
        {!collapsed && <span>{label}</span>}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo + collapse toggle */}
      <div className={`flex items-center border-b border-[#E0DDD5] py-5 ${collapsed ? "justify-center px-3" : "justify-between px-5"}`}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2A6558] text-white font-bold text-xs">
              V
            </span>
            <span className="text-lg font-bold tracking-tight text-[#1A1817]">
              Ven<span className="text-[#2A6558]">YOU</span>
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2A6558] text-white font-bold text-xs">
              V
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden rounded-lg p-1 text-[#7C7671] transition hover:bg-[#EAF2F0] hover:text-[#1A1817] lg:flex"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3 py-4">
        {!collapsed && (
          <span className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-[#C4BDBA]">
            Navigation
          </span>
        )}
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* Recent Events */}
      {!collapsed && recentEvents.length > 0 && (
        <div className="px-3 py-4 border-t border-[#E0DDD5]">
          <span className="mb-2 block px-2 text-[10px] font-semibold uppercase tracking-widest text-[#C4BDBA]">
            Recent Events
          </span>
          <div className="flex flex-col gap-1">
            {recentEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition hover:bg-[#EAF2F0]"
              >
                <Clock size={13} className="shrink-0 text-[#7C7671]" />
                <span className="truncate font-medium text-[#1A1817]">
                  {ev.eventName}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom: AI pill + logout */}
      <div className={`mt-auto border-t border-[#E0DDD5] px-3 py-4 flex flex-col gap-2`}>
        {!collapsed && (
          <div className="flex items-center gap-2 rounded-xl bg-[#1A1817] px-3 py-2.5">
            <Sparkles size={13} className="text-[#7BC4B8] shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-[#7BC4B8]">AI Active</p>
              <p className="text-[10px] text-white/60">Ready to find venues</p>
            </div>
          </div>
        )}
        <Link
          href="/login"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#7C7671] transition hover:bg-red-50 hover:text-red-500 ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-[#E0DDD5] bg-[#FDFCF9] px-5 py-4 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2A6558] text-white font-bold text-xs">
            V
          </span>
          <span className="text-lg font-bold tracking-tight text-[#1A1817]">
            Ven<span className="text-[#2A6558]">YOU</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-1.5 text-[#1A1817]"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[84vw] max-w-72 overflow-y-auto bg-[#FDFCF9] shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-screen overflow-y-auto border-r border-[#E0DDD5] bg-[#FDFCF9] sticky top-0 transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
