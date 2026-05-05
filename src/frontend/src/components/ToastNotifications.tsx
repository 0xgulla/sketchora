import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type ToastType = "info" | "success" | "warning" | "error" | "processing";

export interface ToastNotification {
  id: string;
  type: ToastType;
  message: string;
  sticky?: boolean;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toasts: ToastNotification[];
  showToast: (n: Omit<ToastNotification, "id">) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/* ─── Individual Toast ─────────────────────────────────────── */
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    if (toast.sticky) return;
    const dur = toast.duration ?? 4000;
    timerRef.current = setTimeout(dismiss, dur);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss, toast.sticky, toast.duration]);

  const borderColor = {
    info: "rgba(139,92,246,0.55)",
    processing: "rgba(139,92,246,0.55)",
    success: "rgba(16,185,129,0.55)",
    warning: "rgba(245,158,11,0.55)",
    error: "rgba(239,68,68,0.55)",
  }[toast.type];

  const accentGradient = {
    info: "linear-gradient(180deg,#8b5cf6,#6d28d9)",
    processing: "linear-gradient(180deg,#8b5cf6,#6d28d9)",
    success: "linear-gradient(180deg,#10b981,#059669)",
    warning: "linear-gradient(180deg,#f59e0b,#d97706)",
    error: "linear-gradient(180deg,#ef4444,#dc2626)",
  }[toast.type];

  const glowColor = {
    info: "rgba(139,92,246,0.25)",
    processing: "rgba(139,92,246,0.25)",
    success: "rgba(16,185,129,0.22)",
    warning: "rgba(245,158,11,0.22)",
    error: "rgba(239,68,68,0.22)",
  }[toast.type];

  const progressColor = {
    info: "rgba(139,92,246,0.7)",
    processing: "rgba(139,92,246,0.7)",
    success: "rgba(16,185,129,0.7)",
    warning: "rgba(245,158,11,0.7)",
    error: "rgba(239,68,68,0.7)",
  }[toast.type];

  const icon =
    toast.type === "processing"
      ? null
      : toast.type === "success"
        ? "✅"
        : toast.type === "warning"
          ? "⚠️"
          : toast.type === "error"
            ? "❌"
            : "⚡";

  const dur = toast.duration ?? 4000;

  return (
    <div
      data-ocid={`toast.item.${toast.id}`}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        minWidth: 280,
        maxWidth: 340,
        background: "rgba(12,6,28,0.92)",
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        padding: "14px 14px 18px 16px",
        boxShadow: `0 8px 40px ${glowColor}, 0 2px 12px rgba(0,0,0,0.5)`,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        overflow: "hidden",
        animation: exiting
          ? "toast-slide-out 0.3s cubic-bezier(.4,0,1,1) forwards"
          : "toast-slide-in 0.35s cubic-bezier(.22,1,.36,1) both",
        willChange: "transform, opacity",
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: accentGradient,
          borderRadius: "14px 0 0 14px",
        }}
      />

      {/* Icon / Spinner */}
      <div style={{ flexShrink: 0, marginTop: 1, fontSize: 16, minWidth: 20 }}>
        {toast.type === "processing" ? (
          <div
            style={{
              width: 18,
              height: 18,
              border: "2.5px solid rgba(139,92,246,0.25)",
              borderTopColor: "#8b5cf6",
              borderRadius: "50%",
              animation: "spinner-rotate 0.75s linear infinite",
            }}
            aria-label="Loading"
          />
        ) : (
          <span
            style={{
              animation:
                toast.type === "warning"
                  ? "pulse-glow 2s ease-in-out infinite"
                  : "none",
            }}
          >
            {icon}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.55,
            color: "rgba(240,234,255,0.93)",
            wordBreak: "break-word",
          }}
        >
          {toast.message}
        </p>
        {toast.action && (
          <button
            type="button"
            data-ocid={`toast.action_button.${toast.id}`}
            onClick={() => {
              toast.action?.onClick();
              dismiss();
            }}
            style={{
              marginTop: 8,
              padding: "4px 12px",
              background: accentGradient,
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        aria-label="Dismiss notification"
        data-ocid={`toast.close_button.${toast.id}`}
        onClick={dismiss}
        style={{
          flexShrink: 0,
          width: 20,
          height: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          color: "rgba(240,234,255,0.35)",
          cursor: "pointer",
          fontSize: 14,
          borderRadius: 4,
          transition: "color 0.15s",
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "rgba(240,234,255,0.8)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(240,234,255,0.35)";
        }}
      >
        ×
      </button>

      {/* Progress bar */}
      {!toast.sticky && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 4,
            right: 0,
            height: 3,
            background: "rgba(255,255,255,0.06)",
            borderRadius: "0 0 14px 0",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: progressColor,
              borderRadius: "0 0 14px 0",
              animation: `toast-progress ${dur}ms linear both`,
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Toast Container ──────────────────────────────────────── */
function ToastContainer({
  toasts,
  onDismiss,
}: { toasts: ToastNotification[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      data-ocid="toast.container"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

/* ─── Provider ─────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = useCallback(
    (notification: Omit<ToastNotification, "id">): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { ...notification, id }]);
      return id;
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, dismissToast, dismissAll }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}
