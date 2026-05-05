import { Pen, X } from "lucide-react";
import React from "react";
import gullaLogo from "/assets/uploads/download-1.webp";

interface CreditModalProps {
  onClose: () => void;
  onStartDrawing: () => void;
}

export default function CreditModal({
  onClose,
  onStartDrawing,
}: CreditModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <div
        className="relative flex flex-col items-center gap-5 px-10 py-8 rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.18 0.02 260), oklch(0.14 0.02 260))",
          border: "1px solid oklch(0.75 0.18 65 / 0.35)",
          boxShadow:
            "0 8px 48px rgba(0,0,0,0.55), 0 0 0 1px oklch(0.75 0.18 65 / 0.1)",
          minWidth: "280px",
          animation: "credit-pop 0.28s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full transition-colors"
          style={{
            background: "oklch(0.28 0.02 260)",
            color: "oklch(0.65 0.04 260)",
            border: "1px solid oklch(0.32 0.02 260)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "oklch(0.34 0.02 260)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "oklch(0.85 0.04 260)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "oklch(0.28 0.02 260)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "oklch(0.65 0.04 260)";
          }}
          aria-label="Close"
        >
          <X size={14} />
        </button>

        {/* Logo */}
        <div
          className="flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden"
          style={{
            border: "2px solid oklch(0.75 0.18 65 / 0.5)",
            boxShadow: "0 0 18px oklch(0.75 0.18 65 / 0.25)",
          }}
        >
          <img
            src={gullaLogo}
            alt="Gulla"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-1 text-center">
          <p
            className="text-xs font-medium uppercase tracking-widest"
            style={{ color: "oklch(0.75 0.18 65)" }}
          >
            Created by
          </p>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: "oklch(0.96 0.02 260)" }}
          >
            Gulla
          </h2>
        </div>

        {/* Divider */}
        <div
          className="w-full h-px"
          style={{ background: "oklch(0.75 0.18 65 / 0.2)" }}
        />

        {/* CTA — clicking "Drawing" closes the modal and starts drawing immediately */}
        <button
          type="button"
          onClick={onStartDrawing}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
          style={{
            background: "oklch(0.75 0.18 65)",
            color: "oklch(0.12 0.02 260)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "oklch(0.82 0.18 65)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "oklch(0.75 0.18 65)";
          }}
        >
          <Pen size={14} />
          Drawing
        </button>
      </div>

      <style>{`
        @keyframes credit-pop {
          from { opacity: 0; transform: scale(0.82) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
