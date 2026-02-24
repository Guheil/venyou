"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastItem extends Required<Pick<ToastOptions, "title" | "variant" | "duration">> {
  id: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  success: (title: string, description?: string, duration?: number) => string;
  error: (title: string, description?: string, duration?: number) => string;
  info: (title: string, description?: string, duration?: number) => string;
  warning: (title: string, description?: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<
  ToastVariant,
  {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    border: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconBg: "bg-[#EAF2F0]",
    iconColor: "text-[#2A6558]",
    border: "border-[#C8E0DA]",
  },
  error: {
    icon: AlertCircle,
    iconBg: "bg-[#FDECEA]",
    iconColor: "text-[#C0392B]",
    border: "border-[#F2C5BE]",
  },
  info: {
    icon: Info,
    iconBg: "bg-[#EAF2F0]",
    iconColor: "text-[#2A6558]",
    border: "border-[#E0DDD5]",
  },
  warning: {
    icon: TriangleAlert,
    iconBg: "bg-[#FEF3C7]",
    iconColor: "text-[#92400E]",
    border: "border-[#F8E3A7]",
  },
};

const DEFAULT_DURATION = 3500;
const MAX_TOASTS = 5;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (!timer) return;
    clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const dismissToast = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    },
    [clearTimer]
  );

  const clearToasts = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    setToasts([]);
  }, []);

  const showToast = useCallback(
    ({
      title,
      description,
      variant = "info",
      duration = DEFAULT_DURATION,
      actionLabel,
      onAction,
    }: ToastOptions) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const nextToast: ToastItem = {
        id,
        title,
        description,
        variant,
        duration,
        actionLabel,
        onAction,
      };

      setToasts((prev) => {
        const stacked = [nextToast, ...prev];
        if (stacked.length <= MAX_TOASTS) return stacked;

        const overflow = stacked.slice(MAX_TOASTS);
        overflow.forEach((toast) => clearTimer(toast.id));
        return stacked.slice(0, MAX_TOASTS);
      });

      if (duration > 0) {
        const timer = setTimeout(() => dismissToast(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [clearTimer, dismissToast]
  );

  useEffect(() => {
    const timerMap = timers.current;
    return () => {
      timerMap.forEach((timer) => clearTimeout(timer));
      timerMap.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
      clearToasts,
      success: (title, description, duration) =>
        showToast({ title, description, duration, variant: "success" }),
      error: (title, description, duration) =>
        showToast({ title, description, duration, variant: "error" }),
      info: (title, description, duration) =>
        showToast({ title, description, duration, variant: "info" }),
      warning: (title, description, duration) =>
        showToast({ title, description, duration, variant: "warning" }),
    }),
    [showToast, dismissToast, clearToasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:bottom-6 sm:right-6 sm:w-full">
        {toasts.map((toast) => {
          const style = variantStyles[toast.variant];
          const Icon = style.icon;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl border ${style.border} bg-white p-4 shadow-xl`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${style.iconBg}`}>
                  <Icon size={16} className={style.iconColor} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#1A1817]">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-1 text-xs leading-relaxed text-[#7C7671]">{toast.description}</p>
                  )}

                  {toast.actionLabel && toast.onAction && (
                    <button
                      type="button"
                      onClick={() => {
                        toast.onAction?.();
                        dismissToast(toast.id);
                      }}
                      className="mt-2 text-xs font-semibold text-[#2A6558] hover:underline"
                    >
                      {toast.actionLabel}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-md p-1 text-[#7C7671] transition hover:bg-[#F8F6F1] hover:text-[#1A1817]"
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
