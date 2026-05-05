"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  AdminDeniedState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/AdminUI";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useAdminData } from "@/lib/useAdminData";
import { useToast } from "@/lib/ToastContext";
import {
  AlertTriangle,
  Ban,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

type UserFilter = "all" | "active" | "disabled" | "admins" | "customers";
type UserAction = "disable" | "delete";

interface AdminUserAccount {
  user_id: string;
  email: string | null;
  display_name: string;
  created_at: string;
  updated_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  banned_until: string | null;
  is_disabled: boolean;
  providers: string[] | null;
  admin_role: "owner" | "manager" | "finance" | null;
  admin_is_active: boolean;
  event_count: number;
  reservation_count: number;
  confirmed_reservation_count: number;
}

const filters: { key: UserFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "disabled", label: "Disabled" },
  { key: "admins", label: "Admins" },
  { key: "customers", label: "Customers" },
];

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { accessState, adminProfile } = useAdminData();
  const { success, error: showError } = useToast();
  const [users, setUsers] = useState<AdminUserAccount[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [actionUser, setActionUser] = useState<AdminUserAccount | null>(null);
  const [actionType, setActionType] = useState<UserAction | null>(null);
  const [submittingUserId, setSubmittingUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase.rpc("get_admin_user_accounts");

    if (error) {
      showError(
        "Could not load users",
        "Apply the user-management migration and refresh the page."
      );
      setUsers([]);
      setLoadingUsers(false);
      return;
    }

    setUsers((data ?? []) as AdminUserAccount[]);
    setLoadingUsers(false);
  }, [showError]);

  useEffect(() => {
    if (accessState !== "ready") return;

    let active = true;
    void (async () => {
      await Promise.resolve();
      if (active) void loadUsers();
    })();

    return () => {
      active = false;
    };
  }, [accessState, loadUsers]);

  const counts = {
    all: users.length,
    active: users.filter((account) => !account.is_disabled).length,
    disabled: users.filter((account) => account.is_disabled).length,
    admins: users.filter((account) => account.admin_role).length,
    customers: users.filter((account) => !account.admin_role).length,
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return users.filter((account) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && !account.is_disabled) ||
        (filter === "disabled" && account.is_disabled) ||
        (filter === "admins" && Boolean(account.admin_role)) ||
        (filter === "customers" && !account.admin_role);

      const matchesSearch =
        !q ||
        account.email?.toLowerCase().includes(q) ||
        account.display_name.toLowerCase().includes(q) ||
        account.user_id.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [filter, searchQuery, users]);

  const openConfirm = (type: UserAction, account: AdminUserAccount) => {
    setActionType(type);
    setActionUser(account);
  };

  const closeConfirm = () => {
    if (submittingUserId) return;
    setActionType(null);
    setActionUser(null);
  };

  const handleEnableUser = async (account: AdminUserAccount) => {
    setSubmittingUserId(account.user_id);
    const { data, error } = await supabase.rpc("admin_enable_user_account", {
      p_user_id: account.user_id,
    });
    setSubmittingUserId(null);

    if (error || data === false) {
      showError("Could not enable user", "Please check your admin access.");
      return;
    }

    success("User enabled", `${account.email ?? account.display_name} can sign in again.`);
    await loadUsers();
  };

  const handleConfirmedAction = async () => {
    if (!actionUser || !actionType) return;

    const functionName =
      actionType === "disable"
        ? "admin_disable_user_account"
        : "admin_delete_user_account";

    setSubmittingUserId(actionUser.user_id);
    const { data, error } = await supabase.rpc(functionName, {
      p_user_id: actionUser.user_id,
    });
    setSubmittingUserId(null);

    if (error || data === false) {
      const selfAction = actionUser.user_id === currentUser?.id;
      showError(
        actionType === "disable" ? "Could not disable user" : "Could not delete user",
        selfAction
          ? "You cannot perform this action on your own admin account."
          : "Please check your admin access."
      );
      return;
    }

    success(
      actionType === "disable" ? "User disabled" : "User deleted",
      `${actionUser.email ?? actionUser.display_name} was ${
        actionType === "disable" ? "disabled" : "deleted"
      }.`
    );
    setActionType(null);
    setActionUser(null);
    await loadUsers();
  };

  if (accessState === "loading") {
    return (
      <AdminShell>
        <AdminLoadingState label="Loading user accounts" />
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
                <Users size={13} />
                User Accounts
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#1A1817] sm:text-4xl">
                Manage customer and admin accounts.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B6661] sm:text-base">
                Review sign-in activity, account status, admin roles, event activity, and disable or delete user accounts when needed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadUsers()}
              disabled={loadingUsers}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8D3C9] bg-white px-5 py-3 text-sm font-semibold text-[#1A1817] transition hover:border-[#2A6558] hover:text-[#2A6558] disabled:opacity-60"
            >
              <RefreshCw size={15} className={loadingUsers ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            icon={<Users size={18} />}
            label="Total Users"
            value={String(users.length)}
            detail="Auth accounts in this project"
            tone="accent"
          />
          <AdminMetricCard
            icon={<CheckCircle2 size={18} />}
            label="Active"
            value={String(counts.active)}
            detail="Not currently disabled"
          />
          <AdminMetricCard
            icon={<Ban size={18} />}
            label="Disabled"
            value={String(counts.disabled)}
            detail="Blocked from signing in"
          />
          <AdminMetricCard
            icon={<ShieldCheck size={18} />}
            label="Admins"
            value={String(counts.admins)}
            detail={`Current admin role: ${adminProfile?.role ?? "admin"}`}
            tone="dark"
          />
        </section>

        <AdminPanel className="mt-6">
          <AdminSectionHeader
            eyebrow="Directory"
            title="Filter accounts"
            description="Search by name, email, or user id, then act on the selected account."
            action={
              <span className="rounded-full border border-[#E0DDD5] bg-[#FCFBF8] px-3 py-1 text-xs font-semibold text-[#7C7671]">
                {filteredUsers.length} visible
              </span>
            }
          />
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name, email, or user id..."
                className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-[#FCFBF8] pl-9 pr-4 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {filters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                    filter === item.key
                      ? "border-[#2A6558] bg-[#2A6558] text-white"
                      : "border-[#E0DDD5] bg-white text-[#7C7671] hover:border-[#2A6558]"
                  }`}
                >
                  {item.label}
                  <span className="ml-1 opacity-75">{counts[item.key]}</span>
                </button>
              ))}
            </div>
          </div>
        </AdminPanel>

        <AdminPanel className="mt-6 overflow-hidden p-0">
          {loadingUsers ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Loader2 size={26} className="animate-spin text-[#2A6558]" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Users size={32} className="mx-auto mb-3 text-[#C8C2BB]" />
              <h2 className="text-lg font-extrabold text-[#1A1817]">No users found</h2>
              <p className="mt-1 text-sm text-[#7C7671]">
                Adjust the search or status filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1060px] text-left">
                <thead className="border-b border-[#E0DDD5] bg-[#FCFBF8] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7C7671]">
                  <tr>
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Last login</th>
                    <th className="px-5 py-3">Activity</th>
                    <th className="px-5 py-3">Providers</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EEEA]">
                  {filteredUsers.map((account) => {
                    const isSelf = account.user_id === currentUser?.id;
                    const isBusy = submittingUserId === account.user_id;
                    const providerText =
                      account.providers && account.providers.length > 0
                        ? account.providers.join(", ")
                        : "email";

                    return (
                      <tr key={account.user_id} className="align-top hover:bg-[#FCFBF8]">
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2F0] text-[#2A6558]">
                              <Users size={17} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-[#1A1817]">
                                {account.display_name}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#7C7671]">
                                <Mail size={12} />
                                {account.email ?? "No email"}
                              </p>
                              <p className="mt-1 max-w-[320px] truncate font-mono text-[11px] text-[#B0ABA5]">
                                {account.user_id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                account.is_disabled
                                  ? "border-[#F2C5BE] bg-[#FDECEA] text-[#C0392B]"
                                  : "border-[#C8E0DA] bg-[#EAF2F0] text-[#2A6558]"
                              }`}
                            >
                              {account.is_disabled ? <Ban size={12} /> : <CheckCircle2 size={12} />}
                              {account.is_disabled ? "Disabled" : "Active"}
                            </span>
                            {account.admin_role && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[#E0DDD5] bg-white px-2.5 py-1 text-xs font-semibold text-[#7C7671]">
                                <ShieldCheck size={12} />
                                {account.admin_role}
                              </span>
                            )}
                            {isSelf && (
                              <span className="rounded-full border border-[#E0DDD5] bg-[#FCFBF8] px-2.5 py-1 text-xs font-semibold text-[#7C7671]">
                                You
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-xs text-[#7C7671]">
                            Joined {formatDateTime(account.created_at)}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm text-[#1A1817]">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-[#2A6558]" />
                            {formatDateTime(account.last_sign_in_at)}
                          </div>
                          <p className="mt-1 text-xs text-[#7C7671]">
                            Email {account.email_confirmed_at ? "verified" : "not verified"}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm text-[#1A1817]">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-xl border border-[#E0DDD5] bg-white px-2.5 py-1 text-xs font-semibold">
                              {compact(account.event_count)} events
                            </span>
                            <span className="rounded-xl border border-[#E0DDD5] bg-white px-2.5 py-1 text-xs font-semibold">
                              {compact(account.reservation_count)} reservations
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-xl border border-[#C8E0DA] bg-[#EAF2F0] px-2.5 py-1 text-xs font-semibold text-[#2A6558]">
                              <CalendarCheck size={12} />
                              {compact(account.confirmed_reservation_count)} confirmed
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm capitalize text-[#7C7671]">
                          {providerText}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            {account.is_disabled ? (
                              <button
                                type="button"
                                onClick={() => void handleEnableUser(account)}
                                disabled={isBusy}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#C8E0DA] bg-[#EAF2F0] px-3 text-xs font-semibold text-[#2A6558] transition hover:border-[#2A6558] disabled:opacity-60"
                              >
                                {isBusy ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                                Enable
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openConfirm("disable", account)}
                                disabled={isBusy || isSelf}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Ban size={13} />
                                Disable
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openConfirm("delete", account)}
                              disabled={isBusy || isSelf}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#F2C5BE] bg-[#FDECEA] px-3 text-xs font-semibold text-[#C0392B] transition hover:border-[#C0392B] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>
      </main>

      {actionUser && actionType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeConfirm}
        >
          <div
            className="w-full max-w-md rounded-[24px] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  actionType === "delete"
                    ? "bg-[#FDECEA] text-[#C0392B]"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {actionType === "delete" ? <AlertTriangle size={22} /> : <Ban size={22} />}
              </div>
              <div>
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    actionType === "delete" ? "text-[#C0392B]" : "text-amber-800"
                  }`}
                >
                  Confirm {actionType}
                </p>
                <h2 className="mt-2 text-xl font-extrabold text-[#1A1817]">
                  {actionType === "delete" ? "Delete account?" : "Disable account?"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#6B6661]">
                  {actionType === "delete"
                    ? `This permanently deletes ${actionUser.email ?? actionUser.display_name} and cascades user-owned app records.`
                    : `${actionUser.email ?? actionUser.display_name} will be blocked from signing in until re-enabled.`}
                </p>
              </div>
            </div>

            {actionType === "delete" && (
              <div className="mt-5 rounded-2xl border border-[#F2C5BE] bg-[#FDECEA] p-3 text-xs leading-relaxed text-[#8A3A32]">
                Disable the account instead if you only need to block access temporarily.
              </div>
            )}

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={Boolean(submittingUserId)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E0DDD5] bg-white px-4 text-sm font-semibold text-[#1A1817] transition hover:border-[#2A6558] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmedAction()}
                disabled={submittingUserId === actionUser.user_id}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition disabled:opacity-60 ${
                  actionType === "delete"
                    ? "bg-[#C0392B] hover:bg-[#A93226]"
                    : "bg-amber-700 hover:bg-amber-800"
                }`}
              >
                {submittingUserId === actionUser.user_id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : actionType === "delete" ? (
                  <Trash2 size={15} />
                ) : (
                  <XCircle size={15} />
                )}
                {actionType === "delete" ? "Delete" : "Disable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
