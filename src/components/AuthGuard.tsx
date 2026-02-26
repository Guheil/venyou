"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, needsOnboarding } = useAuth();

  useEffect(() => {
    if (loading || user) return;
    const redirectPath = pathname ?? "";
    router.replace(redirectPath ? `/login?next=${redirectPath}` : "/login");
  }, [loading, pathname, router, user]);

  useEffect(() => {
    if (loading || !user || !needsOnboarding) return;
    router.replace("/register");
  }, [loading, needsOnboarding, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F6F1]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
      </div>
    );
  }

  if (!user || needsOnboarding) return null;

  return <>{children}</>;
}
