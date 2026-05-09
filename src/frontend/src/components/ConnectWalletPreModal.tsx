import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ConnectWalletPreModalProps {
  isOpen: boolean;
  onUnderstand: () => void;
  onReadGuide: () => void;
  onClose: () => void;
}

const KEYFRAMES = `
  @keyframes cwpm-overlay-in  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cwpm-overlay-out { from { opacity: 1; } to { opacity: 0; } }
  @keyframes cwpm-modal-in  {
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes cwpm-modal-out {
    from { opacity: 1; transform: scale(1); }
    to   { opacity: 0; transform: scale(0.85); }
  }
  @keyframes cwpm-wallet-float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33%       { transform: translateY(-8px) rotate(4deg); }
    66%       { transform: translateY(4px) rotate(-3deg); }
  }
  @keyframes cwpm-wallet-glow {
    0%, 100% {
      box-shadow: 0 0 12px rgba(139,92,246,0.5), 0 0 24px rgba(139,92,246,0.25), 0 0 40px rgba(103,232,249,0.1);
    }
    50% {
      box-shadow: 0 0 20px rgba(139,92,246,0.8), 0 0 44px rgba(139,92,246,0.45), 0 0 70px rgba(103,232,249,0.25);
    }
  }
  @keyframes cwpm-title-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes cwpm-gradient-shift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes cwpm-emoji-glow {
    0%, 100% { text-shadow: 0 0 8px rgba(251,191,36,0.6), 0 0 16px rgba(251,191,36,0.3); }
    50%       { text-shadow: 0 0 16px rgba(251,191,36,1), 0 0 32px rgba(251,191,36,0.6), 0 0 48px rgba(251,191,36,0.25); }
  }
  @keyframes cwpm-text-fade {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes cwpm-bullet-enter {
    from { opacity: 0; transform: translateX(-10px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes cwpm-particle-float {
    0%   { transform: translate(0, 0)   scale(1);    opacity: 0.7; }
    25%  { transform: translate(12px, -20px) scale(1.1); opacity: 0.9; }
    50%  { transform: translate(-8px, -38px) scale(0.9); opacity: 0.5; }
    75%  { transform: translate(16px, -24px) scale(1.05); opacity: 0.8; }
    100% { transform: translate(0, 0)   scale(1);    opacity: 0.7; }
  }
  @keyframes cwpm-border-glow {
    0%, 100% { box-shadow: 0 0 0 1px rgba(139,92,246,0.4), 0 0 40px rgba(139,92,246,0.25), 0 25px 50px rgba(0,0,0,0.5); }
    33%       { box-shadow: 0 0 0 1px rgba(103,232,249,0.5), 0 0 50px rgba(103,232,249,0.2), 0 25px 50px rgba(0,0,0,0.5); }
    66%       { box-shadow: 0 0 0 1px rgba(168,85,247,0.55), 0 0 44px rgba(168,85,247,0.3), 0 25px 50px rgba(0,0,0,0.5); }
  }
  @keyframes cwpm-shimmer-btn {
    0%   { transform: translateX(-100%) skewX(-15deg); }
    100% { transform: translateX(250%)  skewX(-15deg); }
  }
  @keyframes cwpm-icon-pulse {
    0%, 100% { opacity: 0.85; }
    50%       { opacity: 1; transform: scale(1.15); }
  }

  .cwpm-overlay     { animation: cwpm-overlay-in  0.3s ease-out both; }
  .cwpm-overlay.closing { animation: cwpm-overlay-out 0.25s ease-in both; }
  .cwpm-modal       { animation: cwpm-modal-in  0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
  .cwpm-modal.closing   { animation: cwpm-modal-out 0.25s ease-in both; }
  .cwpm-wallet-icon { animation: cwpm-wallet-float 3s ease-in-out infinite, cwpm-wallet-glow 2.5s ease-in-out infinite; }
  .cwpm-title       { animation: cwpm-title-up 0.5s 0.1s ease-out both; }
  .cwpm-emoji       { display: inline-block; animation: cwpm-emoji-glow 2s ease-in-out infinite; }
  .cwpm-intro-1     { animation: cwpm-text-fade 0.45s 0.22s ease-out both; }
  .cwpm-intro-2     { animation: cwpm-text-fade 0.45s 0.38s ease-out both; }
  .cwpm-bullet-icon { animation: cwpm-icon-pulse 2s ease-in-out infinite; }
  .cwpm-gradient-text {
    background: linear-gradient(135deg, #c4b5fd 0%, #67e8f9 50%, #a855f7 100%);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: cwpm-gradient-shift 3s ease-in-out infinite;
  }
  .cwpm-glow-word {
    color: #e2d9ff;
    text-shadow: 0 0 8px rgba(139,92,246,0.8), 0 0 16px rgba(139,92,246,0.4);
    font-weight: 600;
  }
  .cwpm-btn-understand {
    background: linear-gradient(135deg, #10b981, #059669);
    color: #fff;
    font-weight: 600;
    border: 1px solid rgba(16,185,129,0.5);
    border-radius: 12px;
    padding: 13px 28px;
    font-size: 15px;
    cursor: pointer;
    transition: box-shadow 0.2s ease, transform 0.15s ease;
    font-family: inherit;
    flex: 1;
    min-width: 0;
  }
  .cwpm-btn-understand:hover {
    box-shadow: 0 0 20px rgba(16,185,129,0.6), 0 0 40px rgba(16,185,129,0.3);
    transform: scale(1.02);
  }
  .cwpm-btn-understand:active {
    transform: scale(0.97);
  }
  .cwpm-btn-guide {
    position: relative;
    overflow: hidden;
    background: transparent;
    color: transparent;
    border: 1px solid rgba(139,92,246,0.5);
    border-radius: 12px;
    padding: 13px 28px;
    font-size: 15px;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
    font-family: inherit;
    flex: 1;
    min-width: 0;
  }
  .cwpm-btn-guide::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 40%;
    height: 200%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
    transform: translateX(-100%) skewX(-15deg);
    pointer-events: none;
  }
  .cwpm-btn-guide:hover::after {
    animation: cwpm-shimmer-btn 0.8s ease forwards;
  }
  .cwpm-btn-guide:hover {
    background: rgba(139,92,246,0.1);
    border-color: rgba(139,92,246,0.8);
    transform: scale(1.02);
  }
  .cwpm-btn-guide:active {
    transform: scale(0.97);
  }
  .cwpm-btn-guide-text {
    position: relative;
    z-index: 1;
    background: linear-gradient(135deg, #c4b5fd 0%, #67e8f9 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 600;
    display: block;
  }
`;

const FONT = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";

const BULLETS: { icon: string; text: string; glowWords?: string[] }[] = [
  { icon: "🔐", text: "Use a supported wallet for the best experience" },
  {
    icon: "⚠️",
    text: "Never share your secret phrase or private key with anyone",
    glowWords: ["secret phrase", "private key"],
  },
  {
    icon: "🌐",
    text: "Make sure you are on the correct network before transactions",
    glowWords: ["correct network"],
  },
  {
    icon: "⛽",
    text: "Some actions may require gas fees",
    glowWords: ["gas fees"],
  },
  {
    icon: "✅",
    text: "Double-check every transaction before approving",
    glowWords: ["every transaction"],
  },
  {
    icon: "🔒",
    text: "Keep your wallet secure and disconnect on shared devices",
  },
  {
    icon: "📖",
    text: "Read our full guide to understand all features, rewards, and safety tips",
  },
];

const PARTICLES = [
  {
    size: 6,
    top: "12%",
    left: "8%",
    color: "rgba(168,85,247,0.8)",
    delay: "0s",
    dur: "7.5s",
  },
  {
    size: 4,
    top: "25%",
    left: "92%",
    color: "rgba(103,232,249,0.7)",
    delay: "1.2s",
    dur: "9s",
  },
  {
    size: 8,
    top: "75%",
    left: "5%",
    color: "rgba(139,92,246,0.75)",
    delay: "0.5s",
    dur: "8s",
  },
  {
    size: 5,
    top: "80%",
    left: "88%",
    color: "rgba(167,139,250,0.8)",
    delay: "2s",
    dur: "10s",
  },
  {
    size: 7,
    top: "45%",
    left: "95%",
    color: "rgba(6,182,212,0.7)",
    delay: "0.8s",
    dur: "8.5s",
  },
  {
    size: 3,
    top: "60%",
    left: "3%",
    color: "rgba(139,92,246,0.65)",
    delay: "1.5s",
    dur: "7s",
  },
  {
    size: 5,
    top: "15%",
    left: "85%",
    color: "rgba(52,211,153,0.6)",
    delay: "3s",
    dur: "11s",
  },
  {
    size: 4,
    top: "90%",
    left: "40%",
    color: "rgba(168,85,247,0.7)",
    delay: "2.3s",
    dur: "9.5s",
  },
  {
    size: 6,
    top: "35%",
    left: "2%",
    color: "rgba(103,232,249,0.65)",
    delay: "1.7s",
    dur: "8.2s",
  },
  {
    size: 3,
    top: "5%",
    left: "55%",
    color: "rgba(139,92,246,0.6)",
    delay: "0.4s",
    dur: "12s",
  },
];

function renderWithGlow(text: string, glowWords?: string[]): React.ReactNode {
  if (!glowWords || glowWords.length === 0) return text;
  const regex = new RegExp(
    `(${glowWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );
  const parts = text.split(regex);
  return parts.map((part, idx) => {
    const isGlow = glowWords.some(
      (w) => w.toLowerCase() === part.toLowerCase(),
    );
    const k = `${idx}-${part.slice(0, 6)}`;
    return isGlow ? (
      <span key={k} className="cwpm-glow-word">
        {part}
      </span>
    ) : (
      <span key={k}>{part}</span>
    );
  });
}

export default function ConnectWalletPreModal({
  isOpen,
  onUnderstand,
  onReadGuide,
  onClose,
}: ConnectWalletPreModalProps) {
  const [closing, setClosing] = useState(false);
  const [visible, setVisible] = useState(false);
  const closingRef = useRef(false);

  // Body scroll lock + open visibility
  useEffect(() => {
    if (isOpen) {
      setClosing(false);
      closingRef.current = false;
      document.body.style.overflow = "hidden";
      // Defer to next paint so portal is in DOM before animation
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") triggerClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const triggerClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      closingRef.current = false;
      onClose();
    }, 260);
  };

  const handleUnderstand = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      closingRef.current = false;
      onUnderstand();
    }, 260);
  };

  const handleReadGuide = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      closingRef.current = false;
      onReadGuide();
    }, 260);
  };

  if (!isOpen && !closing && !visible) return null;

  return createPortal(
    <>
      <style>{KEYFRAMES}</style>

      {/* Full-screen overlay */}
      <div
        role="presentation"
        data-ocid="connect_wallet_pre_modal.backdrop"
        className={`cwpm-overlay${closing ? " closing" : ""}`}
        onClick={triggerClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") triggerClose();
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10050,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "16px",
          boxSizing: "border-box" as const,
          fontFamily: FONT,
        }}
      >
        {/* Floating particles in overlay (behind card) */}
        {PARTICLES.map((p, i) => (
          <div
            key={`p${i}-${p.dur}`}
            style={{
              position: "absolute",
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: p.color,
              top: p.top,
              left: p.left,
              pointerEvents: "none",
              animation: `cwpm-particle-float ${p.dur} ${p.delay} ease-in-out infinite`,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              filter: "blur(0.5px)",
              willChange: "transform",
            }}
          />
        ))}

        {/* Modal card */}
        <dialog
          aria-modal="true"
          aria-labelledby="cwpm-title"
          data-ocid="connect_wallet_pre_modal.dialog"
          className={`cwpm-modal${closing ? " closing" : ""}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") triggerClose();
            e.stopPropagation();
          }}
          open
          style={{
            position: "relative",
            maxWidth: 460,
            width: "100%",
            background: "rgba(15,10,30,0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: 20,
            padding: "32px 28px 28px",
            maxHeight: "90vh",
            overflowY: "auto",
            boxSizing: "border-box" as const,
            willChange: "transform, opacity",
          }}
          // Border glow applied via inline style so it can pulse
          // The cwpm-border-glow class handles the pulsing box-shadow
        >
          {/* Animated glowing border layer */}
          <div
            className="cwpm-border-glow-ring"
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 20,
              pointerEvents: "none",
              animation: "cwpm-border-glow 3s ease-in-out infinite",
              zIndex: -1,
            }}
          />

          {/* Wallet icon */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <div
              className="cwpm-wallet-icon"
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6d28d9 0%, #1d4ed8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                flexShrink: 0,
              }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div
            className="cwpm-title"
            style={{ textAlign: "center", marginBottom: 20 }}
          >
            <h2
              id="cwpm-title"
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              <span className="cwpm-emoji">🚀</span>{" "}
              <span className="cwpm-gradient-text">Before You Connect</span>
            </h2>
          </div>

          {/* Intro text */}
          <div style={{ marginBottom: 18 }}>
            <p
              className="cwpm-intro-1"
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#e8d8ff",
                margin: "0 0 6px 0",
              }}
            >
              Welcome to our app!
            </p>
            <p
              className="cwpm-intro-2"
              style={{
                fontSize: 13,
                color: "rgba(220,210,255,0.7)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Before connecting your wallet, please read these important points
              carefully:
            </p>
          </div>

          {/* Bullet points */}
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 24px 0",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {BULLETS.map((b, i) => (
              <li
                key={b.icon}
                data-ocid={`connect_wallet_pre_modal.bullet.${i + 1}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  animation: `cwpm-bullet-enter 0.4s ${0.4 + i * 0.12}s ease-out both`,
                }}
              >
                <span
                  className="cwpm-bullet-icon"
                  style={{
                    fontSize: 16,
                    lineHeight: "20px",
                    flexShrink: 0,
                    display: "inline-block",
                    marginTop: 1,
                    animationDelay: `${i * 0.2}s`,
                  }}
                  aria-hidden="true"
                >
                  {b.icon}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "rgba(220,210,255,0.82)",
                    minWidth: 0,
                  }}
                >
                  {renderWithGlow(b.text, b.glowWords)}
                </span>
              </li>
            ))}
          </ul>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              data-ocid="connect_wallet_pre_modal.understand_button"
              className="cwpm-btn-understand"
              onClick={handleUnderstand}
            >
              I Understand
            </button>
            <button
              type="button"
              data-ocid="connect_wallet_pre_modal.guide_button"
              className="cwpm-btn-guide"
              onClick={handleReadGuide}
            >
              <span className="cwpm-btn-guide-text">Read Guide</span>
            </button>
          </div>
        </dialog>
      </div>
    </>,
    document.body,
  );
}
