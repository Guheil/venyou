"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  onboardingComplete: boolean;
  needsOnboarding: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authProvider =
    typeof user?.app_metadata?.provider === "string"
      ? user.app_metadata.provider
      : null;
  const isSocialProvider = Boolean(authProvider && authProvider !== "email");
  const onboardingComplete = Boolean(
    user?.user_metadata?.onboarding_complete === true ||
      user?.user_metadata?.onboarding_complete === "true"
  );
  const needsOnboarding = isSocialProvider && !onboardingComplete;

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(error ? null : data.user ?? null);
      setLoading(false);
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      onboardingComplete,
      needsOnboarding,
      signOut,
    }),
    [loading, needsOnboarding, onboardingComplete, signOut, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
