"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabase/client";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, needsOnboarding } = useAuth();
  const [checkingAdminRedirect, setCheckingAdminRedirect] = useState(false);

  useEffect(() => {
    if (loading || user) return;
    const redirectPath = pathname ?? "";
    router.replace(
      redirectPath
        ? `${ROUTES.login}?next=${encodeURIComponent(redirectPath)}`
        : ROUTES.login
    );
  }, [loading, pathname, router, user]);

  useEffect(() => {
    if (loading || !user || !needsOnboarding) return;
    router.replace(ROUTES.register);
  }, [loading, needsOnboarding, router, user]);

  useEffect(() => {
    if (loading || !user || needsOnboarding) {
      return;
    }
    if (pathname === ROUTES.admin || pathname?.startsWith(`${ROUTES.admin}/`)) {
      return;
    }

    let active = true;

    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setCheckingAdminRedirect(true);

      const { data, error } = await supabase.rpc("current_admin_profile");
      if (!active) return;
      if (error) {
        setCheckingAdminRedirect(false);
        return;
      }
      if (Array.isArray(data) && data.length > 0) {
        router.replace(ROUTES.admin);
        return;
      }
      setCheckingAdminRedirect(false);
    })();

    return () => {
      active = false;
    };
  }, [loading, needsOnboarding, pathname, router, user]);

  if (loading || checkingAdminRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F6F1]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
      </div>
    );
  }

  if (!user || needsOnboarding) return null;

  return <>{children}</>;
}
