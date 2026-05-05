"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardList,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import Modal from "@/components/Modal";
import { useAuth } from "@/lib/AuthContext";
import { ROUTES } from "@/lib/routes";
import { useToast } from "@/lib/ToastContext";

interface AdminShellProps {
  children: React.ReactNode;
}

const adminNavItems = [
  { label: "Overview", href: ROUTES.admin, icon: ShieldCheck },
  { label: "Requests", href: ROUTES.adminRequests, icon: Clock },
  { label: "Events", href: ROUTES.adminEvents, icon: CalendarCheck },
  { label: "Users", href: ROUTES.adminUsers, icon: Users },
  { label: "Venues", href: ROUTES.adminVenues, icon: Building2 },
  { label: "Add Venue", href: ROUTES.adminVenueNew, icon: Plus },
  { label: "Analytics", href: ROUTES.adminAnalytics, icon: BarChart3 },
  { label: "Activity", href: ROUTES.adminActivity, icon: ClipboardList },
];

export default function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { error } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      setConfirmLogoutOpen(false);
      router.replace(ROUTES.login);
    } catch {
      error("Unable to sign out", "Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const NavLink = ({
    href,
    icon: Icon,
    label,
  }: {
    href: string;
    icon: React.ElementType;
    label: string;
  }) => {
    const active =
      href === ROUTES.adminVenues
        ? pathname === href
        : pathname === href ||
          (href !== ROUTES.admin && pathname?.startsWith(`${href}/`));

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
      <div
        className={`flex items-center border-b border-[#E0DDD5] py-5 ${
          collapsed ? "justify-center px-3" : "justify-between px-5"
        }`}
      >
        <Link href={ROUTES.admin} className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2A6558] text-xs font-bold text-white">
            V
          </span>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-[#1A1817]">
              Ven<span className="text-[#2A6558]">YOU</span>
              <span className="ml-1 text-xs font-semibold text-[#7C7671]">Admin</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="hidden rounded-lg p-1 text-[#7C7671] transition hover:bg-[#EAF2F0] hover:text-[#1A1817] lg:flex"
          aria-label={collapsed ? "Expand admin navigation" : "Collapse admin navigation"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-4">
        {!collapsed && (
          <span className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-[#C4BDBA]">
            Operations
          </span>
        )}
        {adminNavItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-[#E0DDD5] px-3 py-4">
        {!collapsed && user?.email && (
          <div className="rounded-xl border border-[#E0DDD5] bg-white px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#C4BDBA]">
              Admin session
            </p>
            <p className="truncate text-xs font-medium text-[#1A1817]">{user.email}</p>
          </div>
        )}
        {!collapsed && (
          <div className="rounded-xl bg-[#1A1817] px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#7BC4B8]">
              Manage mode
            </p>
            <p className="mt-1 text-xs text-white/60">
              Payments, venues, and booking operations
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setConfirmLogoutOpen(true)}
          disabled={loggingOut}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#7C7671] transition hover:bg-red-50 hover:text-red-500 ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? "Sign Out" : undefined}
        >
          {loggingOut ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#7C7671] border-t-transparent" />
          ) : (
            <LogOut size={16} className="shrink-0" />
          )}
          {!collapsed && <span>{loggingOut ? "Signing Out..." : "Sign Out"}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <Modal
        open={confirmLogoutOpen}
        onClose={() => {
          if (!loggingOut) setConfirmLogoutOpen(false);
        }}
        title="Sign out?"
        description="You will need to sign in again to access admin operations."
        size="sm"
        closeOnOverlayClick={!loggingOut}
        closeOnEsc={!loggingOut}
        showCloseButton={!loggingOut}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmLogoutOpen(false)}
              disabled={loggingOut}
              className="rounded-xl border border-[#E0DDD5] px-4 py-2 text-sm font-medium text-[#7C7671] transition hover:border-[#1A1817] hover:text-[#1A1817] disabled:opacity-60"
            >
              Stay signed in
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={loggingOut}
              className="flex min-w-28 items-center justify-center gap-2 rounded-xl bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226] disabled:opacity-60"
            >
              {loggingOut ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <LogOut size={16} className="shrink-0" />
              )}
              <span>{loggingOut ? "Signing Out..." : "Sign Out"}</span>
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-[#7C7671]">
          Confirm logout before ending this admin session.
        </p>
      </Modal>

      <div className="flex min-h-screen flex-col bg-[#F8F6F1] lg:flex-row">
        <div className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-[#E0DDD5] bg-[#FDFCF9] px-5 py-4 lg:hidden">
          <Link href={ROUTES.admin} className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2A6558] text-xs font-bold text-white">
              V
            </span>
            <span className="text-lg font-bold tracking-tight text-[#1A1817]">
              Ven<span className="text-[#2A6558]">YOU</span>
              <span className="ml-1 text-xs font-semibold text-[#7C7671]">Admin</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="rounded-lg p-1.5 text-[#1A1817] transition-all duration-200 hover:bg-[#EAF2F0]"
            aria-label="Toggle admin navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div
          className={`fixed inset-0 z-50 transition-opacity duration-300 lg:hidden ${
            mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div
            className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${
              mobileOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setMobileOpen(false)}
          />
          <div
            className={`relative h-full w-[84vw] max-w-72 overflow-y-auto bg-[#FDFCF9] shadow-xl transition-transform duration-300 ease-out ${
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {sidebarContent}
          </div>
        </div>

        <aside
          className={`hidden h-screen flex-col overflow-y-auto border-r border-[#E0DDD5] bg-[#FDFCF9] transition-all duration-300 lg:sticky lg:top-0 lg:flex ${
            collapsed ? "w-16" : "w-64"
          }`}
        >
          {sidebarContent}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
