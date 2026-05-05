import { Pen, X } from "lucide-react";

const sketchoraLogo =
  "/assets/generated/sketchora-logo-transparent.dim_200x200.png";

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <div
        className="relative flex flex-col items-center gap-5 px-8 py-8 rounded-2xl w-full"
        style={{
          background:
            "linear-gradient(135deg, #1a0f2e 0%, #120e1e 60%, #0f1520 100%)",
          border: "1px solid rgba(124,58,237,0.35)",
          boxShadow:
            "0 8px 48px rgba(0,0,0,0.65), 0 0 60px rgba(124,58,237,0.15)",
          maxWidth: 380,
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
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.4)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.12)";
            (e.currentTarget as HTMLButtonElement).style.color = "white";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.06)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "rgba(255,255,255,0.4)";
          }}
          aria-label="Close"
        >
          <X size={14} />
        </button>

        {/* Logo */}
        <div
          className="flex items-center justify-center"
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            overflow: "hidden",
            boxShadow:
              "0 0 30px rgba(124,58,237,0.4), 0 0 60px rgba(16,185,129,0.15)",
            border: "2px solid rgba(124,58,237,0.4)",
            flexShrink: 0,
          }}
        >
          <img
            src={sketchoraLogo}
            alt="Sketchora"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-1 text-center">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#10b981", letterSpacing: "0.12em" }}
          >
            Welcome to
          </p>
          <h2
            className="text-3xl font-bold tracking-tight"
            style={{
              background:
                "linear-gradient(135deg,#f0eaff 0%,#c4b5fd 40%,#6ee7b7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1.1,
            }}
          >
            Sketchora
          </h2>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(240,234,255,0.55)", maxWidth: 220 }}
          >
            Start creating your ideas
          </p>
        </div>

        {/* Divider */}
        <div
          className="w-full h-px"
          style={{
            background:
              "linear-gradient(90deg,transparent,rgba(124,58,237,0.35),rgba(16,185,129,0.25),transparent)",
          }}
        />

        {/* Illustration */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {["✏️", "🎨", "✨"].map((emoji) => (
            <span
              key={emoji}
              style={{
                fontSize: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "rgba(124,58,237,0.12)",
                border: "1px solid rgba(124,58,237,0.2)",
              }}
            >
              {emoji}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onStartDrawing}
          data-ocid="credit.start_drawing.button"
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg,#7c3aed,#10b981)",
            color: "white",
            boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
            letterSpacing: "0.02em",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
            (e.currentTarget as HTMLButtonElement).style.transform =
              "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            (e.currentTarget as HTMLButtonElement).style.transform = "none";
          }}
        >
          <Pen size={15} />
          Start Drawing
        </button>

        <p
          style={{
            fontSize: 11,
            color: "rgba(240,234,255,0.3)",
            textAlign: "center",
            marginTop: -8,
          }}
        >
          Made by Gulla
        </p>
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
