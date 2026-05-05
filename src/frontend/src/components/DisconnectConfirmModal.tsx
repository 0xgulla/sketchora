import { useEffect, useRef, useState } from "react";

interface DisconnectConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DisconnectConfirmModal({
  onConfirm,
  onCancel,
}: DisconnectConfirmModalProps) {
  const [visible, setVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Animate in on mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Escape key to cancel
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div
      ref={overlayRef}
      data-ocid="disconnect.dialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.22s ease-out",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 24,
          background: "rgba(12,8,28,0.98)",
          border: "1px solid rgba(239,68,68,0.2)",
          boxShadow:
            "0 32px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(239,68,68,0.08)",
          padding: "40px 36px 32px",
          position: "relative",
          opacity: visible ? 1 : 0,
          transform: visible
            ? "translateY(0) scale(1)"
            : "translateY(16px) scale(0.97)",
          transition:
            "opacity 0.28s cubic-bezier(.22,1,.36,1), transform 0.28s cubic-bezier(.22,1,.36,1)",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f87171"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#f0eaff",
            textAlign: "center",
            marginBottom: 10,
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          }}
        >
          Disconnect Wallet?
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "rgba(240,234,255,0.55)",
            textAlign: "center",
            lineHeight: 1.65,
            marginBottom: 32,
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          }}
        >
          Do you want to disconnect your wallet?
          <br />
          Your data will be erased or saved locally.
        </p>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            data-ocid="disconnect.confirm_button"
            onClick={onConfirm}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 14,
              background: "linear-gradient(135deg,#dc2626,#b91c1c)",
              border: "1px solid rgba(239,68,68,0.4)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.18s",
              fontFamily: "inherit",
              boxShadow: "0 4px 20px rgba(239,68,68,0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "linear-gradient(135deg,#ef4444,#dc2626)";
              e.currentTarget.style.boxShadow =
                "0 6px 28px rgba(239,68,68,0.5)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                "linear-gradient(135deg,#dc2626,#b91c1c)";
              e.currentTarget.style.boxShadow =
                "0 4px 20px rgba(239,68,68,0.3)";
              e.currentTarget.style.transform = "";
            }}
          >
            Disconnect &amp; Erase Data
          </button>

          <button
            type="button"
            data-ocid="disconnect.cancel_button"
            onClick={onCancel}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 14,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(240,234,255,0.7)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.18s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
